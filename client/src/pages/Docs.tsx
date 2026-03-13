import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Download, FileText, Book, Code, Database, Cpu, GitBranch, ExternalLink, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

interface DocItem {
  title: string;
  titleEn: string;
  desc: string;
  descEn: string;
  size: string;
  date: string;
  category: string;
  version?: string;
  isNew?: boolean;
  isPrimary?: boolean;
}

export default function Docs() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState("all");

  const docs: DocItem[] = [
    // 核心开发指南
    {
      title: "GRT NocoBase 系统开发指南 v1.0",
      titleEn: "GRT NocoBase Development Guide v1.0",
      desc: "完整的系统开发指南，包含架构设计、数据模型、外部数据平台迁移规划、AI/IoT集成方案及Manus+Claude协作开发流程。",
      descEn: "Complete development guide including architecture design, data models, External Sync migration plan, AI/IoT integration, and Manus+Claude collaboration workflow.",
      size: "156 KB",
      date: "2026-01-16",
      category: "development",
      version: "1.0",
      isNew: true,
      isPrimary: true
    },
    // 实施方案
    {
      title: "GRT智能系统快速实施方案",
      titleEn: "GRT Smart System Rapid Implementation Plan",
      desc: "包含16周详细实施计划、工具选型对比及风险管理策略的完整版方案文档。",
      descEn: "Complete implementation plan with 16-week timeline, tool comparison, and risk management strategies.",
      size: "2.4 MB",
      date: "2026-01-14",
      category: "planning",
      version: "1.0"
    },
    // 数据迁移
    {
      title: "外部数据平台迁移手册",
      titleEn: "External Sync Data Migration Manual",
      desc: "详细的数据迁移步骤、字段映射规则、SQL脚本模板及数据验证方法。",
      descEn: "Detailed migration steps, field mapping rules, SQL script templates, and data validation methods.",
      size: "89 KB",
      date: "2026-01-16",
      category: "migration",
      version: "1.0",
      isNew: true
    },
    // API文档
    {
      title: "外部数据平台API集成规范",
      titleEn: "External Sync API Integration Specification",
      desc: "定义了GRT系统与外部数据平台交互的API接口标准、鉴权方式及数据格式。",
      descEn: "API interface standards, authentication methods, and data formats for External Sync integration.",
      size: "1.1 MB",
      date: "2026-01-14",
      category: "api",
      version: "1.0"
    },
    // 流程图
    {
      title: "M0-M12项目全生命周期流程图",
      titleEn: "M0-M12 Project Lifecycle Flowchart",
      desc: "详细描述了从立项到售后的全流程节点及门禁评审标准。",
      descEn: "Complete flowchart from project initiation to after-sales with gate review standards.",
      size: "3.5 MB",
      date: "2026-01-14",
      category: "process"
    },
    // 数据模型
    {
      title: "数据模型设计文档",
      titleEn: "Data Model Design Document",
      desc: "CRM、项目管理、财务、采购、人事等核心模块的数据库表结构设计。",
      descEn: "Database schema design for CRM, project management, finance, procurement, and HR modules.",
      size: "78 KB",
      date: "2026-01-16",
      category: "development",
      version: "1.0",
      isNew: true
    },
    // AI集成
    {
      title: "Gemini Agent集成指南",
      titleEn: "Gemini Agent Integration Guide",
      desc: "智能销售助手的Function Calling定义、知识库配置及对话流程设计。",
      descEn: "Function calling definitions, knowledge base configuration, and conversation flow design for sales assistant.",
      size: "45 KB",
      date: "2026-01-16",
      category: "ai",
      version: "1.0",
      isNew: true
    },
    // IoT集成
    {
      title: "UWB/CCD硬件集成手册",
      titleEn: "UWB/CCD Hardware Integration Manual",
      desc: "UWB定位系统和CCD视觉检测系统的接口协议、数据格式及集成方案。",
      descEn: "Interface protocols, data formats, and integration solutions for UWB positioning and CCD visual inspection.",
      size: "67 KB",
      date: "2026-01-16",
      category: "iot",
      version: "1.0",
      isNew: true
    }
  ];

  const categories = [
    { id: "all", label: "全部文档", labelEn: "All Documents", icon: FileText },
    { id: "development", label: "开发指南", labelEn: "Development", icon: Code },
    { id: "migration", label: "数据迁移", labelEn: "Migration", icon: Database },
    { id: "planning", label: "实施规划", labelEn: "Planning", icon: GitBranch },
    { id: "ai", label: "AI集成", labelEn: "AI Integration", icon: Cpu },
    { id: "iot", label: "IoT集成", labelEn: "IoT Integration", icon: Cpu }
  ];

  const filteredDocs = activeTab === "all" 
    ? docs 
    : docs.filter(doc => doc.category === activeTab);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "development": return <Code className="w-5 h-5" />;
      case "migration": return <Database className="w-5 h-5" />;
      case "planning": return <GitBranch className="w-5 h-5" />;
      case "ai": return <Cpu className="w-5 h-5" />;
      case "iot": return <Cpu className="w-5 h-5" />;
      case "api": return <Code className="w-5 h-5" />;
      case "process": return <GitBranch className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  // 开发指南目录
  const guideOutline = [
    { section: "1", title: "文档概述", titleEn: "Document Overview" },
    { section: "2", title: "系统架构设计", titleEn: "System Architecture" },
    { section: "3", title: "数据模型设计", titleEn: "Data Model Design" },
    { section: "4", title: "外部数据平台迁移规划", titleEn: "External Sync Migration Plan" },
    { section: "5", title: "模块开发指南", titleEn: "Module Development Guide" },
    { section: "6", title: "AI智能化集成", titleEn: "AI Integration" },
    { section: "7", title: "IoT硬件集成", titleEn: "IoT Hardware Integration" },
    { section: "8", title: "实施阶段规划", titleEn: "Implementation Phases" },
    { section: "9", title: "Manus + Claude Code协作方案", titleEn: "Manus + Claude Collaboration" },
    { section: "10", title: "附录", titleEn: "Appendix" }
  ];

  return (
      <div className="space-y-8">
        <PageHeader
          icon={Book}
          title={language === 'zh' ? '文档中心' : 'Documentation Center'}
          description={language === 'zh'
            ? '完整的开发文档、实施指南和技术规范'
            : 'Complete development documentation, implementation guides, and technical specifications'}
        />

        {/* Featured: Development Guide */}
        <Card className="bg-gradient-to-br from-primary/5 via-background to-background border-primary/30 overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Book className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-xl font-heading">
                      {language === 'zh' ? 'GRT NocoBase 系统开发指南' : 'GRT NocoBase Development Guide'}
                    </CardTitle>
                    <Badge className="bg-primary text-primary-foreground">v1.0</Badge>
                    <Badge variant="outline" className="border-green-500 text-green-500">NEW</Badge>
                  </div>
                  <CardDescription>
                    {language === 'zh' 
                      ? '2026-01-16 发布 · 整合外部数据平台数据结构与迁移规划'
                      : 'Released 2026-01-16 · Integrated External Sync data structure and migration plan'}
                  </CardDescription>
                </div>
              </div>
              <Button className="bg-primary hover:bg-primary/90">
                <Download className="w-4 h-4 mr-2" />
                {language === 'zh' ? '下载完整版' : 'Download Full'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 目录 */}
              <div className="space-y-3">
                <h4 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                  {language === 'zh' ? '文档目录' : 'Table of Contents'}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {guideOutline.map((item) => (
                    <div key={item.section} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                      <ChevronRight className="w-3 h-3 text-primary" />
                      <span className="font-mono text-primary">{item.section}.</span>
                      <span>{language === 'zh' ? item.title : item.titleEn}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 关键内容 */}
              <div className="space-y-3">
                <h4 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                  {language === 'zh' ? '核心内容' : 'Key Contents'}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-card rounded-lg border border-border">
                    <div className="text-2xl font-bold text-primary">15+</div>
                    <div className="text-xs text-muted-foreground">
                      {language === 'zh' ? '数据表设计' : 'Data Tables'}
                    </div>
                  </div>
                  <div className="p-3 bg-card rounded-lg border border-border">
                    <div className="text-2xl font-bold text-primary">M0-M12</div>
                    <div className="text-xs text-muted-foreground">
                      {language === 'zh' ? '项目阶段' : 'Project Phases'}
                    </div>
                  </div>
                  <div className="p-3 bg-card rounded-lg border border-border">
                    <div className="text-2xl font-bold text-primary">5</div>
                    <div className="text-xs text-muted-foreground">
                      {language === 'zh' ? '迁移模块' : 'Migration Modules'}
                    </div>
                  </div>
                  <div className="p-3 bg-card rounded-lg border border-border">
                    <div className="text-2xl font-bold text-primary">16</div>
                    <div className="text-xs text-muted-foreground">
                      {language === 'zh' ? '周实施计划' : 'Week Plan'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Categories */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary/50 p-1 h-auto flex-wrap">
            {categories.map((cat) => (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
              >
                <cat.icon className="w-4 h-4" />
                {language === 'zh' ? cat.label : cat.labelEn}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredDocs.map((doc, i) => (
                <Card 
                  key={i} 
                  className={`bg-card border-border hover:border-primary/50 transition-colors group ${
                    doc.isPrimary ? 'md:col-span-2' : ''
                  }`}
                >
                  <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                    <div className="p-3 bg-secondary rounded-sm text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {getCategoryIcon(doc.category)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg font-heading leading-tight">
                          {language === 'zh' ? doc.title : doc.titleEn}
                        </CardTitle>
                        {doc.version && (
                          <Badge variant="outline" className="text-xs">v{doc.version}</Badge>
                        )}
                        {doc.isNew && (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">NEW</Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs font-mono mb-1">
                        SIZE: {doc.size} | UPDATED: {doc.date}
                      </CardDescription>
                      <p className="text-sm text-muted-foreground mt-2">
                        {language === 'zh' ? doc.desc : doc.descEn}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1 border-primary/20 hover:bg-primary/5 hover:text-primary group-hover:border-primary/50">
                        <Download className="w-4 h-4 mr-2" /> 
                        {language === 'zh' ? '下载' : 'Download'}
                      </Button>
                      {doc.isPrimary ? (
                        <Link href="/docs/guide">
                          <Button variant="ghost" className="hover:text-primary">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            {language === 'zh' ? '在线查看' : 'View Online'}
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="ghost" className="hover:text-primary">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          {language === 'zh' ? '在线查看' : 'View Online'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <div className="border-t border-border pt-8">
          <h3 className="text-lg font-heading font-bold mb-4">
            {language === 'zh' ? '快速链接' : 'Quick Links'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="/external-sync" className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group">
              <Database className="w-6 h-6 text-primary mb-2" />
              <div className="font-medium group-hover:text-primary transition-colors">
                {language === 'zh' ? '外部数据平台分析' : 'External Sync Analysis'}
              </div>
              <div className="text-xs text-muted-foreground">
                {language === 'zh' ? '查看现有系统结构' : 'View existing system'}
              </div>
            </a>
            <a href="/roadmap" className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group">
              <GitBranch className="w-6 h-6 text-primary mb-2" />
              <div className="font-medium group-hover:text-primary transition-colors">
                {language === 'zh' ? '实施路线图' : 'Implementation Roadmap'}
              </div>
              <div className="text-xs text-muted-foreground">
                {language === 'zh' ? '16周实施计划' : '16-week plan'}
              </div>
            </a>
            <a href="/tools" className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group">
              <Code className="w-6 h-6 text-primary mb-2" />
              <div className="font-medium group-hover:text-primary transition-colors">
                {language === 'zh' ? '工具推荐' : 'Tool Recommendations'}
              </div>
              <div className="text-xs text-muted-foreground">
                {language === 'zh' ? '技术栈选型' : 'Tech stack selection'}
              </div>
            </a>
            <a href="/risks" className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group">
              <Cpu className="w-6 h-6 text-primary mb-2" />
              <div className="font-medium group-hover:text-primary transition-colors">
                {language === 'zh' ? '风险管理' : 'Risk Management'}
              </div>
              <div className="text-xs text-muted-foreground">
                {language === 'zh' ? '风险识别与应对' : 'Risk identification'}
              </div>
            </a>
          </div>
        </div>
      </div>
  );
}
