import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  Search,
  Download,
  FileText,
  Calendar,
  User,
  Building2,
  FolderOpen,
  Filter,
  FileSpreadsheet,
  FileJson,
  Loader2,
  BookOpen,
  Clock,
  Tag,
  ChevronRight,
  Eye,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// 实体类型映射
const ENTITY_TYPE_MAP: Record<string, string> = {
  project: "项目",
  customer: "客户",
  opportunity: "商机",
  cost_budget: "成本预算",
  quotation: "报价",
  engineering: "工程",
};

// 内容类型映射
const CONTENT_TYPE_MAP: Record<string, { label: string; icon: string }> = {
  text: { label: "文本", icon: "📝" },
  file: { label: "文件", icon: "📎" },
  image: { label: "图片", icon: "🖼️" },
  voice: { label: "语音", icon: "🎤" },
};

export default function NotebookSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<number[]>([]);

  // 模拟搜索结果（实际应调用API）
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("请输入搜索关键词");
      return;
    }

    setIsSearching(true);
    
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 模拟搜索结果
    const mockResults = [
      {
        id: 1,
        notebookId: 1,
        entityType: "project",
        entityId: "PRJ-2026-001",
        entityName: "某汽车零部件清洗线项目",
        contentType: "text",
        content: "客户要求VDA 19.1清洁度标准，节拍60秒，需要超声波清洗+真空干燥工艺组合。",
        processStep: "方案设计",
        createdBy: "张工",
        createdAt: new Date("2026-01-15T10:30:00"),
        aiSuggestions: 2,
      },
      {
        id: 2,
        notebookId: 2,
        entityType: "customer",
        entityId: "CUST-001",
        entityName: "某新能源汽车有限公司",
        contentType: "text",
        content: "客户对GRT-UC系列超声波清洗机感兴趣，计划Q2采购。",
        processStep: "客户跟进",
        createdBy: "李经理",
        createdAt: new Date("2026-01-14T14:20:00"),
        aiSuggestions: 1,
      },
      {
        id: 3,
        notebookId: 3,
        entityType: "opportunity",
        entityId: "OPP-2026-015",
        entityName: "电池壳清洗设备采购",
        contentType: "file",
        content: "技术规格书.pdf",
        processStep: "商机跟进",
        createdBy: "王销售",
        createdAt: new Date("2026-01-13T09:15:00"),
        aiSuggestions: 3,
      },
      {
        id: 4,
        notebookId: 4,
        entityType: "cost_budget",
        entityId: "PRJ-2026-001",
        entityName: "某汽车零部件清洗线项目",
        contentType: "text",
        content: "材料成本预估需要调整，不锈钢板材价格上涨15%。",
        processStep: "成本管理",
        createdBy: "财务部",
        createdAt: new Date("2026-01-12T16:45:00"),
        aiSuggestions: 0,
      },
    ];

    // 应用筛选
    let filtered = mockResults;
    
    if (entityTypeFilter !== "all") {
      filtered = filtered.filter(r => r.entityType === entityTypeFilter);
    }
    
    if (contentTypeFilter !== "all") {
      filtered = filtered.filter(r => r.contentType === contentTypeFilter);
    }
    
    // 关键词过滤
    filtered = filtered.filter(r => 
      r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.entityName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setSearchResults(filtered);
    setIsSearching(false);
    toast.success(`找到 ${filtered.length} 条相关笔记`);
  };

  // 切换选中状态
  const toggleSelection = (id: number) => {
    setSelectedEntries(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedEntries.length === searchResults.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(searchResults.map(r => r.id));
    }
  };

  // 导出为JSON
  const exportAsJson = () => {
    const dataToExport = searchResults.filter(r => selectedEntries.includes(r.id));
    if (dataToExport.length === 0) {
      toast.error("请先选择要导出的笔记");
      return;
    }

    const exportData = {
      exportTime: new Date().toISOString(),
      totalCount: dataToExport.length,
      entries: dataToExport.map(r => ({
        entityType: r.entityType,
        entityId: r.entityId,
        entityName: r.entityName,
        contentType: r.contentType,
        content: r.content,
        processStep: r.processStep,
        createdBy: r.createdBy,
        createdAt: r.createdAt,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notebook-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${dataToExport.length} 条笔记`);
  };

  // 导出为CSV
  const exportAsCsv = () => {
    const dataToExport = searchResults.filter(r => selectedEntries.includes(r.id));
    if (dataToExport.length === 0) {
      toast.error("请先选择要导出的笔记");
      return;
    }

    const headers = ["实体类型", "实体ID", "实体名称", "内容类型", "内容", "流程步骤", "创建人", "创建时间"];
    const rows = dataToExport.map(r => [
      ENTITY_TYPE_MAP[r.entityType] || r.entityType,
      r.entityId,
      r.entityName,
      CONTENT_TYPE_MAP[r.contentType]?.label || r.contentType,
      r.content.replace(/,/g, "，"), // 替换逗号避免CSV格式问题
      r.processStep,
      r.createdBy,
      new Date(r.createdAt).toLocaleString(),
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notebook-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${dataToExport.length} 条笔记`);
  };

  // 导出为Markdown
  const exportAsMarkdown = () => {
    const dataToExport = searchResults.filter(r => selectedEntries.includes(r.id));
    if (dataToExport.length === 0) {
      toast.error("请先选择要导出的笔记");
      return;
    }

    let markdown = `# 笔记导出报告\n\n`;
    markdown += `导出时间: ${new Date().toLocaleString()}\n`;
    markdown += `总计: ${dataToExport.length} 条笔记\n\n`;
    markdown += `---\n\n`;

    dataToExport.forEach((r, index) => {
      markdown += `## ${index + 1}. ${r.entityName}\n\n`;
      markdown += `- **实体类型**: ${ENTITY_TYPE_MAP[r.entityType] || r.entityType}\n`;
      markdown += `- **实体ID**: ${r.entityId}\n`;
      markdown += `- **流程步骤**: ${r.processStep}\n`;
      markdown += `- **内容类型**: ${CONTENT_TYPE_MAP[r.contentType]?.label || r.contentType}\n`;
      markdown += `- **创建人**: ${r.createdBy}\n`;
      markdown += `- **创建时间**: ${new Date(r.createdAt).toLocaleString()}\n\n`;
      markdown += `### 内容\n\n${r.content}\n\n`;
      markdown += `---\n\n`;
    });

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notebook-export-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${dataToExport.length} 条笔记`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          icon={Search}
          title="笔记搜索与导出"
          description="跨项目搜索笔记内容，批量导出知识沉淀"
        />

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              搜索笔记
            </CardTitle>
            <CardDescription>
              输入关键词搜索所有流程笔记内容
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Input */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="输入关键词搜索笔记内容..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-12"
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={isSearching}
                className="h-12 px-8"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                搜索
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">筛选:</span>
              </div>
              
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="实体类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="project">项目</SelectItem>
                  <SelectItem value="customer">客户</SelectItem>
                  <SelectItem value="opportunity">商机</SelectItem>
                  <SelectItem value="cost_budget">成本预算</SelectItem>
                </SelectContent>
              </Select>

              <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="内容类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部内容</SelectItem>
                  <SelectItem value="text">文本</SelectItem>
                  <SelectItem value="file">文件</SelectItem>
                  <SelectItem value="image">图片</SelectItem>
                  <SelectItem value="voice">语音</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="时间范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部时间</SelectItem>
                  <SelectItem value="today">今天</SelectItem>
                  <SelectItem value="week">本周</SelectItem>
                  <SelectItem value="month">本月</SelectItem>
                  <SelectItem value="quarter">本季度</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    搜索结果
                  </CardTitle>
                  <CardDescription>
                    共找到 {searchResults.length} 条相关笔记
                  </CardDescription>
                </div>
                
                {/* Export Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                  >
                    {selectedEntries.length === searchResults.length ? "取消全选" : "全选"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportAsJson}
                    disabled={selectedEntries.length === 0}
                  >
                    <FileJson className="w-4 h-4 mr-1" />
                    导出JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportAsCsv}
                    disabled={selectedEntries.length === 0}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-1" />
                    导出CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportAsMarkdown}
                    disabled={selectedEntries.length === 0}
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    导出Markdown
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                      selectedEntries.includes(result.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleSelection(result.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        {/* Header */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">
                            {ENTITY_TYPE_MAP[result.entityType] || result.entityType}
                          </Badge>
                          <span className="font-medium">{result.entityName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {result.processStep}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {result.entityId}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex items-start gap-2">
                          <span className="text-lg">
                            {CONTENT_TYPE_MAP[result.contentType]?.icon || "📝"}
                          </span>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {result.content}
                          </p>
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {result.createdBy}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(result.createdAt).toLocaleString()}
                          </span>
                          {result.aiSuggestions > 0 && (
                            <span className="flex items-center gap-1 text-primary">
                              <Tag className="w-3 h-3" />
                              {result.aiSuggestions} 条AI建议
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedEntries.includes(result.id)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}>
                        {selectedEntries.includes(result.id) && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {searchResults.length === 0 && !isSearching && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Search className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">开始搜索</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                输入关键词搜索所有项目、客户、商机的笔记内容
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={BookOpen} label="总笔记数" value="1,234" iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={FolderOpen} label="关联项目" value={56} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={Tag} label="AI建议" value={328} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
          <StatCard icon={Download} label="本月导出" value={12} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        </div>
      </div>
    </Layout>
  );
}
