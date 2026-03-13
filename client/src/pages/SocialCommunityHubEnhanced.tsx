/**
 * 社群管理中心增强版 - 批量审核、AI评分、脱敏测试
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquare, CheckCircle, Bot, Shield, BarChart3, Clock,
  Send, ThumbsUp, ThumbsDown, AlertTriangle
} from "lucide-react";

// 待审核消息
const pendingMessages = [
  { id: "m1", content: "请问GRT-5000的最大清洗压力是多少？", sender: "张工", group: "技术交流群", time: "10:30", aiReply: "GRT-5000最大清洗压力为150bar，适用于重度油污清洗场景。", aiScore: 92 },
  { id: "m2", content: "设备调试遇到E003错误代码怎么处理？", sender: "李经理", group: "售后支持群", time: "10:45", aiReply: "E003错误代码通常表示压力传感器异常，请检查传感器连接和校准状态。", aiScore: 88 },
  { id: "m3", content: "能否提供一份产品报价单？", sender: "王总", group: "销售咨询群", time: "11:00", aiReply: "感谢您的咨询，我们的销售团队会尽快与您联系提供详细报价。", aiScore: 85 },
];

// AI回复质量统计
const aiQualityStats = {
  totalReplies: 1234,
  avgScore: 89.5,
  approvalRate: 94.2,
  editRate: 5.8,
};

// 脱敏规则
const desensitizationRules = [
  { id: "r1", name: "手机号码", pattern: "1[3-9]\\d{9}", replacement: "1**********", enabled: true },
  { id: "r2", name: "邮箱地址", pattern: "[\\w.-]+@[\\w.-]+", replacement: "***@***.com", enabled: true },
  { id: "r3", name: "身份证号", pattern: "\\d{17}[\\dXx]", replacement: "******************", enabled: true },
  { id: "r4", name: "银行卡号", pattern: "\\d{16,19}", replacement: "****", enabled: false },
];

// 群活跃度数据
const groupActivityData = [
  { name: "技术交流群", messages: 456, activeUsers: 89, avgResponseTime: "5分钟" },
  { name: "售后支持群", messages: 234, activeUsers: 45, avgResponseTime: "3分钟" },
  { name: "销售咨询群", messages: 178, activeUsers: 34, avgResponseTime: "8分钟" },
];

export default function SocialCommunityHubEnhanced() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("review");
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState("");

  const handleSelectMessage = (id: string) => {
    setSelectedMessages(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedMessages.length === pendingMessages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(pendingMessages.map(m => m.id));
    }
  };

  const handleTestDesensitization = () => {
    let result = testInput;
    desensitizationRules.filter(r => r.enabled).forEach(rule => {
      const regex = new RegExp(rule.pattern, "g");
      result = result.replace(regex, rule.replacement);
    });
    setTestOutput(result);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessageSquare}
        title={t("common.socialHubEnh.title")}
        description={t("common.socialHubEnh.description")}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-card border border-border">
          <TabsTrigger value="review" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />{t("common.socialHubEnh.tabReview")}
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />{t("common.socialHubEnh.tabAi")}
          </TabsTrigger>
          <TabsTrigger value="desensitize" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />{t("common.socialHubEnh.tabDesensitize")}
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />{t("common.socialHubEnh.tabActivity")}
          </TabsTrigger>
        </TabsList>

        {/* 批量审核 */}
        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("common.socialHubEnh.batchReviewTitle")}</CardTitle>
                  <CardDescription>{t("common.socialHubEnh.batchReviewDesc")}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedMessages.length === pendingMessages.length ? t("common.socialHubEnh.deselectAll") : t("common.socialHubEnh.selectAll")}
                  </Button>
                  <Button size="sm" disabled={selectedMessages.length === 0}>
                    {t("common.socialHubEnh.batchApprove")} ({selectedMessages.length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingMessages.map((msg) => (
                  <div key={msg.id} className={`p-4 rounded-lg border ${selectedMessages.includes(msg.id) ? "border-primary bg-primary/5" : "border-border bg-muted"}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={selectedMessages.includes(msg.id)}
                        onCheckedChange={() => handleSelectMessage(msg.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{msg.sender}</span>
                            <Badge variant="outline" className="text-xs">{msg.group}</Badge>
                            <span className="text-xs text-muted-foreground">{msg.time}</span>
                          </div>
                          <Badge className="bg-primary/20 text-primary">{t("common.socialHubEnh.aiScore")}: {msg.aiScore}</Badge>
                        </div>
                        <div className="p-3 bg-background rounded mb-2">
                          <p className="text-sm">{msg.content}</p>
                        </div>
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded">
                          <p className="text-sm text-green-400 flex items-center gap-2">
                            <Bot className="w-4 h-4" />
                            {msg.aiReply}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button size="sm" variant="outline" className="text-green-400 border-green-500/30">
                            <ThumbsUp className="w-4 h-4 mr-1" />{t("common.socialHubEnh.approve")}
                          </Button>
                          <Button size="sm" variant="outline" className="text-yellow-400 border-yellow-500/30">
                            {t("common.socialHubEnh.edit")}
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-400 border-red-500/30">
                            <ThumbsDown className="w-4 h-4 mr-1" />{t("common.socialHubEnh.reject")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI回复质量评分 */}
        <TabsContent value="ai" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{aiQualityStats.totalReplies}</p>
                  <p className="text-sm text-muted-foreground">{t("common.socialHubEnh.totalReplies")}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-400">{aiQualityStats.avgScore}</p>
                  <p className="text-sm text-muted-foreground">{t("common.socialHubEnh.avgScore")}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-400">{aiQualityStats.approvalRate}%</p>
                  <p className="text-sm text-muted-foreground">{t("common.socialHubEnh.approvalRate")}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-400">{aiQualityStats.editRate}%</p>
                  <p className="text-sm text-muted-foreground">{t("common.socialHubEnh.editRate")}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 脱敏规则测试 */}
        <TabsContent value="desensitize" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("common.socialHubEnh.desensitizeRulesConfig")}</CardTitle>
                <CardDescription>{t("common.socialHubEnh.desensitizeRulesConfigDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {desensitizationRules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={rule.enabled} />
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{rule.pattern}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{rule.replacement}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("common.socialHubEnh.realtimeTest")}</CardTitle>
                <CardDescription>{t("common.socialHubEnh.realtimeTestDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t("common.socialHubEnh.inputText")}</label>
                  <Textarea
                    placeholder={t("common.socialHubEnh.inputSensitivePlaceholder")}
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button onClick={handleTestDesensitization} className="w-full">
                  <Shield className="w-4 h-4 mr-2" />{t("common.socialHubEnh.testDesensitize")}
                </Button>
                {testOutput && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t("common.socialHubEnh.desensitizeResult")}</label>
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded">
                      <p className="text-sm">{testOutput}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 群活跃度分析 */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("common.socialHubEnh.activityAnalysis")}</CardTitle>
              <CardDescription>{t("common.socialHubEnh.activityAnalysisDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groupActivityData.map((group, idx) => (
                  <div key={idx} className="p-4 bg-muted rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{group.name}</h3>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{group.avgResponseTime}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{t("common.socialHubEnh.messageCount")}</p>
                        <p className="text-xl font-bold text-primary">{group.messages}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{t("common.socialHubEnh.activeUsers")}</p>
                        <p className="text-xl font-bold text-green-400">{group.activeUsers}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
