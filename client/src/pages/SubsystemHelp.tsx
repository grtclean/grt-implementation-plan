import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import SubsystemHelpPanel, {
  SubsystemType, 
  allSubsystemHelpContents 
} from "@/components/SubsystemHelpPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  BookOpen, 
  ChevronRight, 
  ClipboardList, 
  Cog, 
  Search, 
  Settings, 
  Target, 
  Workflow 
} from "lucide-react";
import { useState } from "react";

export default function SubsystemHelp() {
  const { t } = useLanguage();
  const [selectedSubsystem, setSelectedSubsystem] = useState<SubsystemType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // 过滤子系统
  const filteredSubsystems = allSubsystemHelpContents.filter(content => 
    content.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    content.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    content.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 子系统图标映射
  const getSubsystemIcon = (id: SubsystemType) => {
    const iconMap: Record<SubsystemType, React.ReactNode> = {
      "mes": <Settings className="h-6 w-6" />,
      "ai-purchase": <Target className="h-6 w-6" />,
      "finance-3331": <ClipboardList className="h-6 w-6" />,
      "gate-management": <Workflow className="h-6 w-6" />,
      "workflow-engine": <Cog className="h-6 w-6" />,
      "talent-grid": <Target className="h-6 w-6" />,
    };
    return iconMap[id] || <BookOpen className="h-6 w-6" />;
  };

  // 子系统颜色映射
  const getSubsystemColor = (id: SubsystemType) => {
    const colorMap: Record<SubsystemType, string> = {
      "mes": "bg-blue-500/10 text-blue-500 border-blue-500/20",
      "ai-purchase": "bg-purple-500/10 text-purple-500 border-purple-500/20",
      "finance-3331": "bg-green-500/10 text-green-500 border-green-500/20",
      "gate-management": "bg-orange-500/10 text-orange-500 border-orange-500/20",
      "workflow-engine": "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      "talent-grid": "bg-pink-500/10 text-pink-500 border-pink-500/20",
    };
    return colorMap[id] || "bg-primary/10 text-primary border-primary/20";
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          icon={BookOpen}
          title="子系统操作手册"
          description="Subsystem Operation Manual - 各子系统的操作步骤、前期输入和执行效果"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：子系统列表 */}
          <div className="lg:col-span-1 space-y-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索子系统..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* 子系统卡片列表 */}
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-4">
                {filteredSubsystems.map(content => (
                  <Card
                    key={content.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedSubsystem === content.id 
                        ? "ring-2 ring-primary shadow-md" 
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedSubsystem(content.id)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg border ${getSubsystemColor(content.id)}`}>
                          {getSubsystemIcon(content.id)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-medium truncate">
                            {content.name}
                          </CardTitle>
                          <CardDescription className="text-xs truncate">
                            {content.nameEn}
                          </CardDescription>
                        </div>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${
                          selectedSubsystem === content.id ? "rotate-90" : ""
                        }`} />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {content.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ClipboardList className="h-3 w-3" />
                          {content.prerequisites.length}项输入
                        </span>
                        <span className="flex items-center gap-1">
                          <Workflow className="h-3 w-3" />
                          {content.operationFlows.length}个流程
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {content.effects.length}项效果
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredSubsystems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">未找到匹配的子系统</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* 右侧：帮助内容详情 */}
          <div className="lg:col-span-2">
            {selectedSubsystem ? (
              <SubsystemHelpPanel 
                subsystem={selectedSubsystem} 
                onClose={() => setSelectedSubsystem(null)}
              />
            ) : (
              <Card className="h-[calc(100vh-280px)] flex items-center justify-center">
                <CardContent className="text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">选择一个子系统</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    从左侧列表中选择一个子系统，查看详细的操作步骤、前期输入要求和执行效果说明
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
