/**
 * Help帮助中心页面
 * 
 * 功能：
 * 1. 模糊搜索
 * 2. 上下文感知帮助
 * 3. 热门问题
 * 4. 关联帮助推荐
 */

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Clock, 
  ExternalLink, 
  FileText, 
  HelpCircle, 
  Lightbulb, 
  MessageSquare, 
  Search, 
  Star,
  TrendingUp,
  Video,
  Zap
} from "lucide-react";

// 帮助文章数据
const helpArticles = [
  {
    id: "H001",
    title: "如何创建新项目",
    category: "项目管理",
    tags: ["项目", "创建", "立项"],
    content: "在项目管理模块中，点击'新建项目'按钮，填写项目基本信息...",
    views: 1250,
    helpful: 98,
    relatedIds: ["H002", "H003"],
  },
  {
    id: "H002",
    title: "项目阶段如何推进",
    category: "项目管理",
    tags: ["项目", "阶段", "M0-M12"],
    content: "项目阶段推进需要完成当前阶段的所有门禁检查项...",
    views: 980,
    helpful: 95,
    relatedIds: ["H001", "H004"],
  },
  {
    id: "H003",
    title: "如何添加项目成员",
    category: "项目管理",
    tags: ["项目", "成员", "权限"],
    content: "在项目详情页面，点击'团队'标签，然后点击'添加成员'按钮...",
    views: 756,
    helpful: 92,
    relatedIds: ["H001", "H005"],
  },
  {
    id: "H004",
    title: "CRM客户管理入门",
    category: "CRM",
    tags: ["CRM", "客户", "管理"],
    content: "CRM模块帮助您管理客户信息、联系人和商机...",
    views: 1100,
    helpful: 96,
    relatedIds: ["H006", "H007"],
  },
  {
    id: "H005",
    title: "如何创建商机",
    category: "CRM",
    tags: ["CRM", "商机", "销售"],
    content: "在CRM模块中，选择客户后点击'新建商机'按钮...",
    views: 890,
    helpful: 94,
    relatedIds: ["H004", "H006"],
  },
  {
    id: "H006",
    title: "报价单生成指南",
    category: "CRM",
    tags: ["报价", "销售", "商机"],
    content: "在商机详情页面，点击'生成报价单'按钮...",
    views: 1050,
    helpful: 97,
    relatedIds: ["H005", "H007"],
  },
  {
    id: "H007",
    title: "成本管理操作指南",
    category: "财务",
    tags: ["成本", "财务", "预算"],
    content: "成本管理模块帮助您跟踪项目成本和预算执行...",
    views: 720,
    helpful: 91,
    relatedIds: ["H008", "H009"],
  },
  {
    id: "H008",
    title: "如何提交付款申请",
    category: "财务",
    tags: ["付款", "财务", "审批"],
    content: "在成本管理模块中，选择项目后点击'付款申请'按钮...",
    views: 680,
    helpful: 93,
    relatedIds: ["H007", "H009"],
  },
  {
    id: "H009",
    title: "发票管理流程",
    category: "财务",
    tags: ["发票", "财务", "开票"],
    content: "发票管理包括开票申请、发票登记和核销...",
    views: 590,
    helpful: 90,
    relatedIds: ["H007", "H008"],
  },
  {
    id: "H010",
    title: "AI智能诊断使用指南",
    category: "AI功能",
    tags: ["AI", "诊断", "设备"],
    content: "AI智能诊断系统可以帮助您快速定位设备故障...",
    views: 1500,
    helpful: 99,
    relatedIds: ["H011", "H012"],
  },
  {
    id: "H011",
    title: "如何使用协作工作台",
    category: "协作",
    tags: ["协作", "团队", "文档"],
    content: "协作工作台支持多人实时编辑文档和任务协作...",
    views: 850,
    helpful: 94,
    relatedIds: ["H010", "H012"],
  },
  {
    id: "H012",
    title: "文档上传与解析",
    category: "文档",
    tags: ["文档", "上传", "解析"],
    content: "系统支持PDF、Word、图片等格式的文档上传和自动解析...",
    views: 920,
    helpful: 95,
    relatedIds: ["H010", "H011"],
  },
];

// 热门搜索
const hotSearches = [
  "项目创建",
  "商机管理",
  "报价单",
  "付款申请",
  "AI诊断",
  "文档上传",
  "权限申请",
  "密码重置",
];

// 分类
const categories = [
  { id: "all", name: "全部", icon: BookOpen },
  { id: "项目管理", name: "项目管理", icon: FileText },
  { id: "CRM", name: "CRM", icon: TrendingUp },
  { id: "财务", name: "财务", icon: Zap },
  { id: "AI功能", name: "AI功能", icon: Lightbulb },
  { id: "协作", name: "协作", icon: MessageSquare },
  { id: "文档", name: "文档", icon: FileText },
];

export default function HelpCenter() {
  const { user, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState<typeof helpArticles[0] | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // 模糊搜索算法
  const fuzzySearch = (query: string, text: string): number => {
    if (!query) return 0;
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    // 完全匹配
    if (textLower.includes(queryLower)) return 100;
    
    // 计算相似度
    let score = 0;
    let queryIndex = 0;
    
    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
      if (textLower[i] === queryLower[queryIndex]) {
        score += 10;
        queryIndex++;
      }
    }
    
    // 标签匹配加分
    return score;
  };

  // 搜索结果
  const searchResults = useMemo(() => {
    let results = helpArticles;
    
    // 分类筛选
    if (selectedCategory !== "all") {
      results = results.filter(a => a.category === selectedCategory);
    }
    
    // 模糊搜索
    if (searchQuery) {
      results = results.map(article => {
        const titleScore = fuzzySearch(searchQuery, article.title);
        const contentScore = fuzzySearch(searchQuery, article.content) * 0.5;
        const tagScore = article.tags.some(t => 
          t.toLowerCase().includes(searchQuery.toLowerCase())
        ) ? 50 : 0;
        
        return {
          ...article,
          score: titleScore + contentScore + tagScore,
        };
      })
      .filter(a => a.score > 0)
      .sort((a, b) => b.score - a.score);
    } else {
      // 按浏览量排序
      results = [...results].sort((a, b) => b.views - a.views);
    }
    
    return results;
  }, [searchQuery, selectedCategory]);

  // 热门文章
  const popularArticles = useMemo(() => {
    return [...helpArticles].sort((a, b) => b.views - a.views).slice(0, 5);
  }, []);

  // 关联文章
  const relatedArticles = useMemo(() => {
    if (!selectedArticle) return [];
    return helpArticles.filter(a => selectedArticle.relatedIds.includes(a.id));
  }, [selectedArticle]);

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query && !searchHistory.includes(query)) {
      setSearchHistory(prev => [query, ...prev].slice(0, 10));
    }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* 页面标题和搜索 */}
        <PageHeader
          icon={HelpCircle}
          title="帮助中心"
          description="搜索帮助文档，快速找到您需要的答案"
        />
        <div className="text-center space-y-4">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="输入关键词搜索..." 
                className="pl-12 h-12 text-lg"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
              />
            </div>
            {/* 热门搜索 */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <span className="text-sm text-muted-foreground">热门搜索：</span>
              {hotSearches.map(term => (
                <Badge 
                  key={term} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => handleSearch(term)}
                >
                  {term}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧分类 */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">分类浏览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedCategory === cat.id 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <cat.icon className="h-4 w-4" />
                  <span className="text-sm">{cat.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {cat.id === "all" 
                      ? helpArticles.length 
                      : helpArticles.filter(a => a.category === cat.id).length
                    }
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 中间内容 */}
          <div className="lg:col-span-2 space-y-4">
            {selectedArticle ? (
              // 文章详情
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedArticle(null)}
                    >
                      ← 返回列表
                    </Button>
                    <Badge variant="outline">{selectedArticle.category}</Badge>
                  </div>
                  <CardTitle className="mt-4">{selectedArticle.title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {selectedArticle.views} 次浏览
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {selectedArticle.helpful}% 觉得有帮助
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p>{selectedArticle.content}</p>
                    <p>
                      这里是详细的操作步骤说明。系统会根据您的角色和权限显示相应的功能入口。
                      如果您在操作过程中遇到任何问题，可以点击页面右下角的帮助按钮获取即时帮助。
                    </p>
                    <h3>操作步骤</h3>
                    <ol>
                      <li>登录系统并进入相应模块</li>
                      <li>点击相关功能按钮</li>
                      <li>填写必要信息</li>
                      <li>提交并等待审批（如需要）</li>
                    </ol>
                    <h3>注意事项</h3>
                    <ul>
                      <li>确保您有相应的操作权限</li>
                      <li>必填字段需完整填写</li>
                      <li>提交前请仔细核对信息</li>
                    </ul>
                  </div>
                  <div className="flex items-center gap-2 mt-6 pt-6 border-t">
                    <span className="text-sm text-muted-foreground">这篇文章对您有帮助吗？</span>
                    <Button variant="outline" size="sm">👍 有帮助</Button>
                    <Button variant="outline" size="sm">👎 没帮助</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // 文章列表
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {searchQuery ? `搜索结果 (${searchResults.length})` : "帮助文章"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {searchResults.length > 0 ? (
                        searchResults.map(article => (
                          <div
                            key={article.id}
                            className="p-4 border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => setSelectedArticle(article)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium">{article.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {article.content}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {article.category}
                                  </Badge>
                                  {article.tags.slice(0, 3).map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground py-12">
                          <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>未找到相关帮助文章</p>
                          <p className="text-sm mt-2">尝试使用其他关键词搜索</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧边栏 */}
          <div className="lg:col-span-1 space-y-4">
            {/* 热门文章 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  热门文章
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {popularArticles.map((article, idx) => (
                  <div
                    key={article.id}
                    className="flex items-center gap-2 cursor-pointer hover:text-primary"
                    onClick={() => setSelectedArticle(article)}
                  >
                    <span className="text-sm text-muted-foreground w-4">{idx + 1}</span>
                    <span className="text-sm truncate">{article.title}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 关联文章 */}
            {selectedArticle && relatedArticles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    相关文章
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {relatedArticles.map(article => (
                    <div
                      key={article.id}
                      className="text-sm cursor-pointer hover:text-primary"
                      onClick={() => setSelectedArticle(article)}
                    >
                      {article.title}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* 快速入口 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">快速入口</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Video className="h-4 w-4 mr-2" />
                  视频教程
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  用户手册
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  在线客服
                </Button>
              </CardContent>
            </Card>

            {/* 搜索历史 */}
            {searchHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    搜索历史
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((term, idx) => (
                      <Badge 
                        key={idx} 
                        variant="outline" 
                        className="cursor-pointer"
                        onClick={() => handleSearch(term)}
                      >
                        {term}
                      </Badge>
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
