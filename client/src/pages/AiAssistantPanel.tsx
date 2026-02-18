/**
 * AI助手面板组件
 * 展示员工数字助手和功能型AI助手
 */

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Bot, Zap, CheckCircle, Clock } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PageHeader, StatCard } from "@/components/grt";

export default function AiAssistantPanel() {
  const { toast } = useToast();
  const [selectedAssistant, setSelectedAssistant] = useState<string | null>(null);
  const [executionMode, setExecutionMode] = useState<'internal' | 'generative'>('internal');

  const showPlaceholder = (featureName: string) => {
    toast({
      title: '功能完善中',
      description: `${featureName}功能正在开发完善中，敬请期待`,
    });
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
        title="AI助手面板"
        description="展示员工数字助手和功能型AI助手"
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Bot} label="员工数字助手" value={stats?.employeeDigitalAssistants || 0} subtitle="已配置" iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Zap} label="功能型助手" value={stats?.functionalAssistants || 0} subtitle="活跃" iconColor="text-yellow-500" iconBg="bg-yellow-100" />
        <StatCard icon={CheckCircle} label="建议执行" value={stats?.totalExecutions || 0} subtitle="总计" iconColor="text-green-500" iconBg="bg-green-100" />
      </div>

      {/* 主要内容区域 */}
      <Tabs defaultValue="functional" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="functional">功能型AI助手</TabsTrigger>
          <TabsTrigger value="employee">员工数字助手</TabsTrigger>
        </TabsList>

        {/* 功能型AI助手标签页 */}
        <TabsContent value="functional" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {functionalAssistants?.map((assistant) => (
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
                      快速执行
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
                      深度分析
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
                  <p className="text-muted-foreground">暂无可用的功能型AI助手</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 员工数字助手标签页 */}
        <TabsContent value="employee" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>我的数字助手</CardTitle>
              <CardDescription>个人专属AI助手配置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {employeeDA ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium">{employeeDA.displayName || '我的数字助手'}</span>
                    </div>
                    <Badge variant="default">已激活</Badge>
                  </div>

                  <div className="bg-muted p-3 rounded-lg space-y-2">
                    <p className="text-sm font-medium">启用的能力：</p>
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
                      编辑配置
                    </Button>
                    <Button size="sm" variant="outline">
                      查看日志
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground mb-4">您还没有配置个人数字助手</p>
                  <Button onClick={() => showPlaceholder('创建数字助手')}>创建数字助手</Button>
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
            <CardTitle>AI执行模式</CardTitle>
            <CardDescription>选择AI建议的执行方式</CardDescription>
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
                    系统内AI（快速）
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    基于系统内部数据快速生成建议，响应时间&lt;5秒
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
                    泛互式AI（深度）
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    调用大模型进行深度分析，提供更详细的建议
                  </p>
                </CardContent>
              </Card>
            </div>

            <Button className="w-full" onClick={() => showPlaceholder('AI执行建议')}>执行建议</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
