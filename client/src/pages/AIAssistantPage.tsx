import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Bot, Plus, Zap, MessageSquare, Settings } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, StatCard } from "@/components/grt";
import Layout from "@/components/Layout";

export default function AIAssistantPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  // 获取AI助手数据
  const { data: assistants, isLoading, refetch } = (trpc.aiAssistant as any).listAssistants.useQuery({});

  // AI助手操作mutations
  const createAssistantMutation = (trpc.aiAssistant as any).createAssistant.useMutation({
    onSuccess: () => {
      toast({ title: "AI助手创建成功" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });

  const generateSuggestionMutation = trpc.aiAssistant.generateSuggestion.useMutation({
    onSuccess: () => {
      toast({ title: "建议生成成功" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });

  const filteredAssistants = assistants?.filter((assistant) =>
    assistant.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={Bot}
        title="AI助手管理"
        description="管理系统AI助手、生成建议和跟踪执行效果"
      />

      {/* 快速操作 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Zap} label="活跃助手" value={assistants?.filter((a) => a.isActive).length || 0} iconColor="text-yellow-500" iconBg="bg-yellow-100" />
        <StatCard icon={MessageSquare} label="待处理建议" value={12} iconColor="text-blue-500" iconBg="bg-blue-100" />
        <StatCard icon={AlertCircle} label="执行成功率" value="87%" iconColor="text-green-500" iconBg="bg-green-100" />
      </div>

      {/* 搜索和操作 */}
      <Card>
        <CardHeader>
          <CardTitle>AI助手列表</CardTitle>
          <CardDescription>查看和管理所有AI助手</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="搜索AI助手..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新建助手
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 助手列表 */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">全部助手</TabsTrigger>
          <TabsTrigger value="active">活跃</TabsTrigger>
          <TabsTrigger value="inactive">已禁用</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssistants.length === 0 ? (
              <Card className="md:col-span-2">
                <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  没有找到AI助手
                </CardContent>
              </Card>
            ) : (
              filteredAssistants.map((assistant) => (
                <Card key={assistant.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{assistant.name}</CardTitle>
                        <CardDescription>{assistant.description}</CardDescription>
                      </div>
                      <Badge variant={assistant.isActive ? "default" : "secondary"}>
                        {assistant.isActive ? "启用" : "禁用"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">执行模式</p>
                      <p className="text-sm font-medium">{assistant.executionMode || "自动"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">最后更新</p>
                      <p className="text-sm font-medium">
                        {new Date(assistant.updatedAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Settings className="w-4 h-4 mr-2" />
                        配置
                      </Button>
                      <Button size="sm" className="flex-1">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        生成建议
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="active">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssistants.filter((a) => a.isActive).length === 0 ? (
              <Card className="md:col-span-2">
                <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  没有活跃的AI助手
                </CardContent>
              </Card>
            ) : (
              filteredAssistants
                .filter((a) => a.isActive)
                .map((assistant) => (
                  <Card key={assistant.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{assistant.name}</CardTitle>
                      <CardDescription>{assistant.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          配置
                        </Button>
                        <Button size="sm" className="flex-1">
                          生成建议
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="inactive">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssistants.filter((a) => !a.isActive).length === 0 ? (
              <Card className="md:col-span-2">
                <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  没有已禁用的AI助手
                </CardContent>
              </Card>
            ) : (
              filteredAssistants
                .filter((a) => !a.isActive)
                .map((assistant) => (
                  <Card key={assistant.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{assistant.name}</CardTitle>
                      <CardDescription>{assistant.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">此助手已禁用</p>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
}
