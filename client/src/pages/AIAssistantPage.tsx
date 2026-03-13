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
import { useLanguage } from "@/contexts/LanguageContext";

export default function AIAssistantPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  // 获取AI助手数据
  const { data: assistants, isLoading, refetch } = (trpc.aiAssistant as any).listAssistants.useQuery({});

  // AI助手操作mutations
  const createAssistantMutation = (trpc.aiAssistant as any).createAssistant.useMutation({
    onSuccess: () => {
      toast({ title: t("ai.assistantPage.title") });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const generateSuggestionMutation = trpc.aiAssistant.generateSuggestion.useMutation({
    onSuccess: () => {
      toast({ title: t("ai.assistantPage.generateSuggestion") });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredAssistants = assistants?.filter((assistant) =>
    assistant.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">{t("ai.assistantPage.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bot}
        title={t("ai.assistantPage.title")}
        description={t("ai.assistantPage.description")}
      />

      {/* 快速操作 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Zap} label={t("ai.assistantPage.activeAssistants")} value={assistants?.filter((a) => a.isActive).length || 0} iconColor="text-yellow-500" iconBg="bg-yellow-100" />
        <StatCard icon={MessageSquare} label={t("ai.assistantPage.pendingSuggestions")} value={12} iconColor="text-blue-500" iconBg="bg-blue-100" />
        <StatCard icon={AlertCircle} label={t("ai.assistantPage.executionRate")} value="87%" iconColor="text-green-500" iconBg="bg-green-100" />
      </div>

      {/* 搜索和操作 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("ai.assistantPage.assistantList")}</CardTitle>
          <CardDescription>{t("ai.assistantPage.viewManage")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder={t("ai.assistantPage.search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("ai.assistantPage.newAssistant")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 助手列表 */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">{t("ai.assistantPage.allAssistants")}</TabsTrigger>
          <TabsTrigger value="active">{t("ai.assistantPage.activeTab")}</TabsTrigger>
          <TabsTrigger value="inactive">{t("ai.assistantPage.inactiveTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssistants.length === 0 ? (
              <Card className="md:col-span-2">
                <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {t("ai.assistantPage.noAssistantsFound")}
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
                        {assistant.isActive ? t("ai.assistantPage.enabled") : t("ai.assistantPage.disabled")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{t("ai.assistantPage.executionMode")}</p>
                      <p className="text-sm font-medium">{assistant.executionMode || t("ai.assistantPage.auto")}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{t("ai.assistantPage.lastUpdated")}</p>
                      <p className="text-sm font-medium">
                        {new Date(assistant.updatedAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Settings className="w-4 h-4 mr-2" />
                        {t("ai.assistantPage.configure")}
                      </Button>
                      <Button size="sm" className="flex-1">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {t("ai.assistantPage.generateSuggestion")}
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
                  {t("ai.assistantPage.noActiveAssistants")}
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
                          {t("ai.assistantPage.configure")}
                        </Button>
                        <Button size="sm" className="flex-1">
                          {t("ai.assistantPage.generateSuggestion")}
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
                  {t("ai.assistantPage.noInactiveAssistants")}
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
                      <p className="text-sm text-muted-foreground">{t("ai.assistantPage.assistantDisabled")}</p>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
