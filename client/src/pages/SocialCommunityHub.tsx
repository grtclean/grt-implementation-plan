/**
 * 社群管理中心 - 消息审核、AI回复、脱敏测试、群消息统计
 */
import { useState } from "react";
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
  const [activeTab, setActiveTab] = useState("review");
  const [testInput, setTestInput] = useState("");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessageSquare}
        title="社群管理中心"
        description="消息审核、AI回复、脱敏过滤、统计分析"
        actions={<Button size="sm"><Bot className="w-4 h-4 mr-2" />配置AI助手</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="待审核回复" value={8} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Send} label="今日已发布" value={23} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Shield} label="脱敏处理" value={156} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={BarChart3} label="活跃群组" value={12} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-card border border-border">
          <TabsTrigger value="review"><MessageSquare className="w-4 h-4 mr-2" />消息审核</TabsTrigger>
          <TabsTrigger value="ai"><Bot className="w-4 h-4 mr-2" />AI回复</TabsTrigger>
          <TabsTrigger value="desensitize"><Shield className="w-4 h-4 mr-2" />脱敏测试</TabsTrigger>
          <TabsTrigger value="stats"><BarChart3 className="w-4 h-4 mr-2" />消息统计</TabsTrigger>
          <TabsTrigger value="templates"><Edit className="w-4 h-4 mr-2" />模板管理</TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>待审核回复队列</CardTitle><CardDescription>AI草拟的回复等待人工审核</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockPendingReplies.map((reply) => (
                  <div key={reply.id} className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{reply.groupName}</Badge>
                      <Badge variant="secondary">待审核</Badge>
                    </div>
                    <div className="p-3 bg-background rounded border border-border">
                      <p className="text-sm text-muted-foreground mb-1">原始消息:</p>
                      <p>{reply.originalMsg}</p>
                    </div>
                    <div className="p-3 bg-primary/5 rounded border border-primary/20">
                      <p className="text-sm text-primary mb-1">AI草拟回复:</p>
                      <p>{reply.aiDraft}</p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline"><Edit className="w-4 h-4 mr-1" />修改</Button>
                      <Button size="sm" variant="destructive"><X className="w-4 h-4 mr-1" />驳回</Button>
                      <Button size="sm"><Check className="w-4 h-4 mr-1" />批准发布</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>AI回复编辑器</CardTitle><CardDescription>手动触发AI生成回复</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea placeholder="输入需要回复的消息内容..." rows={4} />
                <Button><Bot className="w-4 h-4 mr-2" />生成AI回复</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="desensitize" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>脱敏规则测试</CardTitle><CardDescription>测试脱敏规则效果</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea 
                  placeholder="输入测试文本，如：张三的手机号是13812345678，邮箱是zhangsan@company.com" 
                  rows={4}
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                />
                <Button><Shield className="w-4 h-4 mr-2" />测试脱敏</Button>
                {testInput && (
                  <div className="p-3 bg-muted rounded">
                    <p className="text-sm text-muted-foreground mb-1">脱敏结果:</p>
                    <p>***的手机号是***，邮箱是***@***.com</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>群消息统计</CardTitle><CardDescription>消息量、活跃度、响应时间分析</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">[消息统计图表 - 按群组/时间段统计]</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>回复模板管理</CardTitle><CardDescription>预设回复模板库</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">[模板列表 - 分类管理回复模板]</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
