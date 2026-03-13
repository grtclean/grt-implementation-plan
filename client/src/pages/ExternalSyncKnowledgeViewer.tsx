/**
 * 数据同步平台知识库查看器
 * 搜索、分类筛选、卡片网格视图、点击展开完整内容
 */

import React, { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  BookOpen, Search, Loader2, FileText, ChevronDown, ChevronUp,
  RefreshCw, Download, Tag
} from "lucide-react";

export default function ExternalSyncKnowledgeViewer() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Knowledge import mutation
  const importKnowledge = trpc.externalSync.importKnowledge.useMutation();

  // Query documents
  const docsQuery = trpc.externalSync.getKnowledgeDocuments.useQuery({
    category: category !== 'all' ? category : undefined,
    search: search || undefined,
    limit: 100,
  });

  const docs = docsQuery.data?.documents || [];
  const total = docsQuery.data?.total || 0;
  const categoryStats = docsQuery.data?.categoryStats || {};

  const handleImport = () => {
    importKnowledge.mutate(undefined, {
      onSuccess: () => docsQuery.refetch(),
    });
  };

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const doc of docs) {
      if (Array.isArray(doc.tags)) {
        doc.tags.forEach((t: string) => tagSet.add(t));
      }
    }
    return Array.from(tagSet).slice(0, 30);
  }, [docs]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            {t("admin.extSyncKnowledge.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("admin.extSyncKnowledge.subtitle")}</p>
        </div>
        <Button onClick={handleImport} disabled={importKnowledge.isPending}>
          {importKnowledge.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
          {importKnowledge.isPending ? t("admin.extSyncKnowledge.importing") : t("admin.extSyncKnowledge.generateDocs")}
        </Button>
      </div>

      {/* Import result toast */}
      {importKnowledge.data && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 text-sm">
          {t("admin.extSyncKnowledge.importComplete")} {importKnowledge.data.documentsCreated} {t("admin.extSyncKnowledge.docsCreated")}, {importKnowledge.data.documentsUpdated} {t("admin.extSyncKnowledge.docsUpdated")}
          {importKnowledge.data.errors.length > 0 && `, ${importKnowledge.data.errors.length} ${t("admin.extSyncKnowledge.errors")}`}
        </div>
      )}

      {/* Search & filter bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("admin.extSyncKnowledge.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("admin.extSyncKnowledge.categoryFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.extSyncKnowledge.allCategories")} ({total})</SelectItem>
            {Object.entries(categoryStats).map(([cat, cnt]) => (
              <SelectItem key={cat} value={cat}>{cat} ({cnt as number})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => docsQuery.refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Main content: card grid */}
        <div className="flex-1">
          {docsQuery.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : docs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>{t("admin.extSyncKnowledge.noDocs")}</p>
              <p className="text-xs mt-1">{t("admin.extSyncKnowledge.noDocsHint")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {docs.map((doc: any) => (
                <Card key={doc.id} className="overflow-hidden">
                  <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm leading-snug">{doc.title}</CardTitle>
                      {expandedId === doc.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                      {doc.source && <Badge variant="secondary" className="text-xs">{doc.source}</Badge>}
                    </div>
                  </CardHeader>

                  {expandedId === doc.id && (
                    <CardContent className="pt-0">
                      {/* Tags */}
                      {Array.isArray(doc.tags) && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {doc.tags.slice(0, 15).map((tag: string, idx: number) => (
                            <span key={idx} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[10px]">
                              <Tag className="h-2.5 w-2.5" />{tag}
                            </span>
                          ))}
                          {doc.tags.length > 15 && <span className="text-[10px] text-muted-foreground">+{doc.tags.length - 15}</span>}
                        </div>
                      )}

                      {/* Markdown-ish content */}
                      <div className="prose prose-sm dark:prose-invert max-h-[400px] overflow-y-auto text-xs">
                        <MarkdownRenderer content={doc.content} />
                      </div>

                      <div className="text-[10px] text-muted-foreground mt-3 pt-2 border-t">
                        {t("admin.extSyncKnowledge.created")} {doc.created_at ? new Date(doc.created_at).toLocaleString() : '-'}
                        {' | '}
                        {t("admin.extSyncKnowledge.updatedAt")} {doc.updated_at ? new Date(doc.updated_at).toLocaleString() : '-'}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar: stats */}
        <div className="w-48 flex-shrink-0 space-y-4 hidden lg:block">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">{t("admin.extSyncKnowledge.stats")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("admin.extSyncKnowledge.totalDocs")}</span>
                <span className="font-medium">{total}</span>
              </div>
              {Object.entries(categoryStats).map(([cat, cnt]) => (
                <div key={cat} className="flex justify-between">
                  <span className="text-muted-foreground">{cat}</span>
                  <span className="font-medium">{cnt as number}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {allTags.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">{t("admin.extSyncKnowledge.popularTags")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {allTags.slice(0, 20).map((tag, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{tag}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Simple Markdown renderer for tables and headings
 */
function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactElement[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableRows.length === 0) return;
    elements.push(
      <table key={`table-${elements.length}`} className="w-full text-xs border-collapse my-2">
        <thead>
          <tr>
            {tableRows[0].map((cell, i) => (
              <th key={i} className="border px-2 py-1 bg-muted text-left">{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.slice(1).map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className="border px-2 py-1">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
    tableRows = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Skip separator rows
      if (/^\|[-| :]+\|$/.test(trimmed)) {
        inTable = true;
        continue;
      }
      const cells = trimmed.split('|').filter(Boolean).map(c => c.trim());
      if (!inTable && tableRows.length === 0) {
        inTable = true;
      }
      tableRows.push(cells);
      continue;
    }

    // End of table
    if (inTable) {
      flushTable();
      inTable = false;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      elements.push(<h2 key={elements.length} className="text-base font-bold mt-3 mb-1">{trimmed.slice(2)}</h2>);
    } else if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={elements.length} className="text-sm font-semibold mt-2 mb-1">{trimmed.slice(3)}</h3>);
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      elements.push(<p key={elements.length} className="font-medium">{trimmed.slice(2, -2)}</p>);
    } else if (trimmed.includes('**')) {
      // Bold inline
      const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
      elements.push(
        <p key={elements.length}>
          {parts.map((part, i) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={i}>{part.slice(2, -2)}</strong>
              : <span key={i}>{part}</span>
          )}
        </p>
      );
    } else if (trimmed === '') {
      // skip empty lines
    } else {
      elements.push(<p key={elements.length}>{trimmed}</p>);
    }
  }

  // Flush remaining table
  if (tableRows.length > 0) flushTable();

  return <>{elements}</>;
}
