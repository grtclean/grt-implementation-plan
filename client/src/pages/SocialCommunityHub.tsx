/**
 * 社群管理中心 - 消息审核、AI回复、脱敏测试、群消息统计
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Bot, Shield, BarChart3, Send, Check, X, Edit } from "lucide-react";

const mockPendingReplies = [
  { id: "rp_001", originalMsg: "请问清洗线的周期时间是多少？", aiDraft: "您好！我们的标准清洗线周期时间为45秒/件，可根据具体工艺需求调整。", groupName: "上汽技术交流群", status: "pending" },
  { id: "rp_002", originalMsg: "喷嘴堵塞怎么处理？", aiDraft: "喷嘴堵塞建议：1.检查过滤器 2.清洗喷嘴 3.调整压力参数。如需技术支持请联系我们。", groupName: "一汽售后群", status: "pending" },
];

const mockMessages = [
  { id: "msg_001", content: "新项目启动会议安排", sender: "张工", groupName: "内部协作群", timestamp: "14:30", isDesensitized: false },
  { id: "msg_002", content: "客户反馈：***设备运行正常", sender: "李工", groupName: "上汽技术交流群", timestamp: "14:25", isDesensitized: true },
];

export default function SocialCommunityHub() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("review");
  const [testInput, setTestInput] = useState("");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessageSquare}
        title={t("common.socialHub.title")}
        description={t("common.socialHub.description")}
        actions={<Button size="sm"><Bot className="w-4 h-4 mr-2" />{t("common.socialHub.configAi")}</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label={t("common.socialHub.pendingReplies")} value={8} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Send} label={t("common.socialHub.todayPublished")} value={23} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Shield} label={t("common.socialHub.desensitization")} value={156} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={BarChart3} label={t("common.socialHub.activeGroups")} value={12} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-card border border-border">
          <TabsTrigger value="review"><MessageSquare className="w-4 h-4 mr-2" />{t("common.socialHub.tabReview")}</TabsTrigger>
          <TabsTrigger value="ai"><Bot className="w-4 h-4 mr-2" />{t("common.socialHub.tabAi")}</TabsTrigger>
          <TabsTrigger value="desensitize"><Shield className="w-4 h-4 mr-2" />{t("common.socialHub.tabDesensitize")}</TabsTrigger>
          <TabsTrigger value="stats"><BarChart3 className="w-4 h-4 mr-2" />{t("common.socialHub.tabStats")}</TabsTrigger>
          <TabsTrigger value="templates"><Edit className="w-4 h-4 mr-2" />{t("common.socialHub.tabTemplates")}</TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("common.socialHub.pendingQueueTitle")}</CardTitle><CardDescription>{t("common.socialHub.pendingQueueDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockPendingReplies.map((reply) => (
                  <div key={reply.id} className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{reply.groupName}</Badge>
                      <Badge variant="secondary">{t("common.socialHub.pendingBadge")}</Badge>
                    </div>
                    <div className="p-3 bg-background rounded border border-border">
                      <p className="text-sm text-muted-foreground mb-1">{t("common.socialHub.originalMessage")}</p>
                      <p>{reply.originalMsg}</p>
                    </div>
                    <div className="p-3 bg-primary/5 rounded border border-primary/20">
                      <p className="text-sm text-primary mb-1">{t("common.socialHub.aiDraftReply")}</p>
                      <p>{reply.aiDraft}</p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline"><Edit className="w-4 h-4 mr-1" />{t("common.socialHub.modify")}</Button>
                      <Button size="sm" variant="destructive"><X className="w-4 h-4 mr-1" />{t("common.socialHub.dismiss")}</Button>
                      <Button size="sm"><Check className="w-4 h-4 mr-1" />{t("common.socialHub.approvePublish")}</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("common.socialHub.aiReplyEditor")}</CardTitle><CardDescription>{t("common.socialHub.aiReplyEditorDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea placeholder={t("common.socialHub.inputPlaceholder")} rows={4} />
                <Button><Bot className="w-4 h-4 mr-2" />{t("common.socialHub.generateAiReply")}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="desensitize" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("common.socialHub.desensitizeRulesTitle")}</CardTitle><CardDescription>{t("common.socialHub.desensitizeRulesDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea 
                  placeholder={t("common.socialHub.desensitizeTestPlaceholder")} 
                  rows={4}
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                />
                <Button><Shield className="w-4 h-4 mr-2" />{t("common.socialHub.testDesensitize")}</Button>
                {testInput && (
                  <div className="p-3 bg-muted rounded">
                    <p className="text-sm text-muted-foreground mb-1">{t("common.socialHub.desensitizeResult")}</p>
                    <p>***的手机号是***，邮箱是***@***.com</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("common.socialHub.messageStatsTitle")}</CardTitle><CardDescription>{t("common.socialHub.messageStatsDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">{t("common.socialHub.messageStatsPlaceholder")}</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("common.socialHub.templateTitle")}</CardTitle><CardDescription>{t("common.socialHub.templateDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">{t("common.socialHub.templatePlaceholder")}</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
