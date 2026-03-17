/**
 * AI助手面板组件
 * 展示员工数字助手和功能型AI助手
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Bot, Zap, CheckCircle, Clock } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PageHeader, StatCard } from "@/components/grt";

export default function AiAssistantPanel() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedAssistant, setSelectedAssistant] = useState<string | null>(null);
  const [executionMode, setExecutionMode] = useState<'internal' | 'generative'>('internal');

  // 创建数字助手 Dialog 状态
  const [createDAOpen, setCreateDAOpen] = useState(false);
  const [formDisplayName, setFormDisplayName] = useState('');

  // 创建数字助手 mutation
  const createDAMutation = trpc.employeeDA.create.useMutation({
    onSuccess: () => {
      setCreateDAOpen(false);
      setFormDisplayName('');
      toast({ title: t("ai.panel.createSuccess"), description: `${formDisplayName}` });
    },
    onError: () => {
      toast({ title: t("ai.panel.createFailed"), description: t("ai.panel.retryLater"), variant: 'destructive' });
    },
  });

  const handleCreateDA = () => {
    if (!formDisplayName.trim()) {
      toast({ title: t("ai.panel.nameRequired"), variant: 'destructive' });
      return;
    }
    createDAMutation.mutate({ displayName: formDisplayName.trim() });
  };

  // 获取AI助手统计信息
  const { data: stats } = (trpc.newAiAssistant as any).getStats.useQuery();

  // 获取功能型AI助手列表
  const { data: functionalAssistants } = (trpc.newAiAssistant as any).getActiveFunctionalAssistants.useQuery();

  // 获取员工数字助手
  const { data: employeeDA } = (trpc.newAiAssistant as any).getEmployeeDA.useQuery(
    { employeeId: 'current-user-id' },
    { enabled: false }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bot}
        title={t("ai.panel.title")}
        description={t("ai.panel.description")}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Bot} label={t("ai.panel.employeeDA")} value={stats?.employeeDigitalAssistants || 0} subtitle={t("ai.panel.configured")} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Zap} label={t("ai.panel.functionalAssistants")} value={stats?.functionalAssistants || 0} subtitle={t("ai.panel.activeLabel")} iconColor="text-yellow-500" iconBg="bg-yellow-100" />
        <StatCard icon={CheckCircle} label={t("ai.panel.suggestionExec")} value={stats?.totalExecutions || 0} subtitle={t("ai.panel.totalLabel")} iconColor="text-green-500" iconBg="bg-green-100" />
      </div>

      {/* 主要内容区域 */}
      <Tabs defaultValue="functional" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="functional">{t("ai.panel.functionalTab")}</TabsTrigger>
          <TabsTrigger value="employee">{t("ai.panel.employeeTab")}</TabsTrigger>
        </TabsList>

        {/* 功能型AI助手标签页 */}
        <TabsContent value="functional" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {functionalAssistants?.map((assistant: any) => (
              <Card key={assistant.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{assistant.displayName}</CardTitle>
                    </div>
                    <Badge variant="outline">{assistant.assistantType}</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    v{assistant.version}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assistant.description && (
                    <p className="text-sm text-muted-foreground">{assistant.description}</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedAssistant(assistant.id);
                        setExecutionMode('internal');
                      }}
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      {t("ai.panel.quickExecute")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedAssistant(assistant.id);
                        setExecutionMode('generative');
                      }}
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      {t("ai.panel.deepAnalysis")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!functionalAssistants || functionalAssistants.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">{t("ai.panel.noFunctionalAssistants")}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 员工数字助手标签页 */}
        <TabsContent value="employee" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("ai.panel.myDigitalAssistant")}</CardTitle>
              <CardDescription>{t("ai.panel.personalConfig")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {employeeDA ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium">{employeeDA.displayName || t("ai.panel.myDigitalAssistant")}</span>
                    </div>
                    <Badge variant="default">{t("ai.panel.activated")}</Badge>
                  </div>

                  <div className="bg-muted p-3 rounded-lg space-y-2">
                    <p className="text-sm font-medium">{t("ai.panel.enabledCapabilities")}</p>
                    <div className="flex flex-wrap gap-2">
                      {employeeDA.capabilities && Object.entries(employeeDA.capabilities).map(([key, enabled]) => (
                        enabled && (
                          <Badge key={key} variant="secondary">
                            {key}
                          </Badge>
                        )
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      {t("ai.panel.editConfig")}
                    </Button>
                    <Button size="sm" variant="outline">
                      {t("ai.panel.viewLogs")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground mb-4">{t("ai.panel.noPersonalDA")}</p>
                  <Button onClick={() => setCreateDAOpen(true)}>{t("ai.panel.createDA")}</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 执行模式选择器 */}
      {selectedAssistant && (
        <Card>
          <CardHeader>
            <CardTitle>{t("ai.panel.executionModeTitle")}</CardTitle>
            <CardDescription>{t("ai.panel.executionModeDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                className={`cursor-pointer ${executionMode === 'internal' ? 'border-primary' : ''}`}
                onClick={() => setExecutionMode('internal')}
              >
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    {t("ai.panel.internalAI")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t("ai.panel.internalAIDesc")}
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer ${executionMode === 'generative' ? 'border-primary' : ''}`}
                onClick={() => setExecutionMode('generative')}
              >
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t("ai.panel.generativeAI")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t("ai.panel.generativeAIDesc")}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Button className="w-full" onClick={() => toast({ title: t("ai.panel.aiAnalyzing"), description: t("ai.panel.aiAnalyzingDesc") })}>{t("ai.panel.executeSuggestion")}</Button>
          </CardContent>
        </Card>
      )}

      {/* 创建数字助手 Dialog */}
      <Dialog open={createDAOpen} onOpenChange={(open) => { setCreateDAOpen(open); if (!open) setFormDisplayName(''); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("ai.panel.createDATitle")}</DialogTitle>
            <DialogDescription>{t("ai.panel.createDADesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="displayName">{t("ai.panel.assistantName")}</Label>
              <Input
                id="displayName"
                placeholder={t("ai.panel.assistantNamePlaceholder")}
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateDA(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDAOpen(false); setFormDisplayName(''); }}>{t("ai.panel.cancel")}</Button>
            <Button onClick={handleCreateDA} disabled={createDAMutation.isPending}>
              {createDAMutation.isPending ? t("ai.panel.creating") : t("ai.panel.confirmCreate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
