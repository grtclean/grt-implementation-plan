/**
 * 社群管理与AI助手页面
 * 功能：微信群消息监听、AI回复草拟、人工审核发布
 */

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import {
  MessageSquare, Users, Bot, CheckCircle, Clock, Send,
  AlertTriangle, RefreshCw, Search, Filter, Eye, Edit, Trash2,
  Plus, Settings, Activity
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge, createStatusColorMap } from "@/components/grt";

const statusColorMap = createStatusColorMap({
  pending: "yellow",
  approved: "green",
  rejected: "red",
  published: "blue",
  failed: "red",
});

const statusLabels: Record<string, string> = {
  pending: "待审核",
  approved: "已批准",
  rejected: "已拒绝",
  published: "已发布",
  failed: "发布失败",
};

export default function SocialCommunity() {
  const [activeTab, setActiveTab] = useState("messages");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  
  // 新建群组表单
  const [newGroup, setNewGroup] = useState({
    groupName: "",
    platform: "wechat",
    groupId: "",
    description: "",
  });

  // tRPC查询
  const { data: stats, isLoading: statsLoading } = trpc.socialCommunity.getStats.useQuery();
  const { data: groups } = trpc.socialCommunity.getGroups.useQuery();
  const { data: messages, refetch: refetchMessages } = trpc.socialCommunity.getMessages.useQuery({
    groupId: selectedGroup !== "all" ? parseInt(selectedGroup) : undefined,
    page: 1,
    pageSize: 50,
  } as any);
  const { data: drafts, refetch: refetchDrafts } = (trpc.socialCommunity as any).getDraftReplies.useQuery({
    status: "pending",
    page: 1,
    pageSize: 20,
  });
  const { data: publishQueue, refetch: refetchQueue } = trpc.socialCommunity.getPublishQueue.useQuery({
    status: "queued" as any,
    page: 1,
    pageSize: 20,
  });

  // tRPC mutations
  const createGroupMutation = trpc.socialCommunity.createGroup.useMutation({
    onSuccess: () => {
      toast.success("群组创建成功");
      setShowCreateGroupDialog(false);
      setNewGroup({ groupName: "", platform: "wechat", groupId: "", description: "" });
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const generateReplyMutation = (trpc.socialCommunity as any).generateAIReply.useMutation({
    onSuccess: () => {
      toast.success("AI回复已生成，请审核");
      refetchDrafts();
    },
    onError: (error) => {
      toast.error(`生成失败: ${error.message}`);
    },
  });

  const reviewDraftMutation = trpc.socialCommunity.reviewDraft.useMutation({
    onSuccess: () => {
      toast.success("审核完成");
      setShowReviewDialog(false);
      refetchDrafts();
      refetchQueue();
    },
    onError: (error) => {
      toast.error(`审核失败: ${error.message}`);
    },
  });

  const publishMessageMutation = (trpc.socialCommunity as any).publishMessage.useMutation({
    onSuccess: () => {
      toast.success("消息已发布");
      refetchQueue();
    },
    onError: (error) => {
      toast.error(`发布失败: ${error.message}`);
    },
  });

  return (
      <div className="space-y-6">
        <PageHeader
          icon={MessageSquare}
          title="社群管理"
          description="微信群消息监听、AI智能回复、人工审核发布"
          actions={
            <>
              <Button variant="outline" onClick={() => refetchMessages()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
              <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    添加群组
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>添加社群群组</DialogTitle>
                    <DialogDescription>
                      配置需要监听的社群群组信息
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>群组名称</Label>
                      <Input
                        value={newGroup.groupName}
                        onChange={(e) => setNewGroup({ ...newGroup, groupName: e.target.value })}
                        placeholder="如：GRT技术交流群"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>平台</Label>
                      <Select
                        value={newGroup.platform}
                        onValueChange={(v) => setNewGroup({ ...newGroup, platform: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wechat">微信</SelectItem>
                          <SelectItem value="dingtalk">钉钉</SelectItem>
                          <SelectItem value="feishu">飞书</SelectItem>
                          <SelectItem value="telegram">Telegram</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>群组ID</Label>
                      <Input
                        value={newGroup.groupId}
                        onChange={(e) => setNewGroup({ ...newGroup, groupId: e.target.value })}
                        placeholder="平台群组唯一标识"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>描述</Label>
                      <Textarea
                        value={newGroup.description}
                        onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                        placeholder="群组用途描述"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateGroupDialog(false)}>
                      取消
                    </Button>
                    <Button
                      onClick={() => createGroupMutation.mutate({ groupWxId: newGroup.groupId, name: newGroup.groupName, description: newGroup.description } as any)}
                      disabled={createGroupMutation.isPending}
                    >
                      {createGroupMutation.isPending ? "创建中..." : "创建"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="活跃群组" value={stats?.activeGroups || 0} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
          <StatCard icon={MessageSquare} label="今日消息" value={stats?.todayMessages || 0} iconColor="text-green-400" iconBg="bg-green-500/10" />
          <StatCard icon={Clock} label="待审核" value={stats?.pendingDrafts || 0} iconColor="text-yellow-400" iconBg="bg-yellow-500/10" />
          <StatCard icon={Bot} label="AI回复率" value={`${stats?.aiReplyRate || 0}%`} iconColor="text-purple-400" iconBg="bg-purple-500/10" />
        </div>

        {/* 主要内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="messages">
              <MessageSquare className="w-4 h-4 mr-2" />
              消息列表
            </TabsTrigger>
            <TabsTrigger value="drafts">
              <Bot className="w-4 h-4 mr-2" />
              AI草稿审核
              {(stats?.pendingDrafts || 0) > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                  {stats?.pendingDrafts}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="queue">
              <Send className="w-4 h-4 mr-2" />
              发布队列
            </TabsTrigger>
            <TabsTrigger value="groups">
              <Users className="w-4 h-4 mr-2" />
              群组管理
            </TabsTrigger>
          </TabsList>

          {/* 消息列表 */}
          <TabsContent value="messages" className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="搜索消息内容..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-background"
                />
              </div>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="选择群组" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部群组</SelectItem>
                  {groups?.items?.map((group: any) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.group_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {messages?.items?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>暂无消息记录</p>
                    </div>
                  ) : (
                    messages?.items?.map((msg: any) => (
                      <div key={msg.id} className="p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{msg.sender_name || "未知用户"}</span>
                              <Badge variant="outline" className="text-xs">
                                {msg.group_name || "未知群组"}
                              </Badge>
                              {msg.is_question && (
                                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                  问题
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {msg.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(msg.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {msg.is_question && !msg.has_reply && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateReplyMutation.mutate({ messageId: msg.id })}
                                disabled={generateReplyMutation.isPending}
                              >
                                <Bot className="w-4 h-4 mr-1" />
                                生成回复
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI草稿审核 */}
          <TabsContent value="drafts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  待审核的AI回复草稿
                </CardTitle>
                <CardDescription>
                  AI自动生成的回复需要人工审核后才能发布
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {drafts?.items?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>没有待审核的草稿</p>
                    </div>
                  ) : (
                    drafts?.items?.map((draft: any) => (
                      <Card key={draft.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">原始问题：</p>
                                <p className="text-sm">{draft.original_message}</p>
                              </div>
                              <StatusBadge color={statusColorMap[draft.status as keyof typeof statusColorMap] ?? "gray"}>
                                {statusLabels[draft.status] || draft.status}
                              </StatusBadge>
                            </div>
                            <div className="border-l-2 border-primary pl-4">
                              <p className="text-sm text-muted-foreground">AI回复草稿：</p>
                              <p className="text-sm whitespace-pre-wrap">{draft.draft_content}</p>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>置信度: {(draft.confidence_score * 100).toFixed(0)}%</span>
                                <span>•</span>
                                <span>{new Date(draft.created_at).toLocaleString()}</span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedDraft(draft);
                                    setShowReviewDialog(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  审核
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 发布队列 */}
          <TabsContent value="queue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  发布队列
                </CardTitle>
                <CardDescription>
                  已审核通过的消息等待发布
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {publishQueue?.items?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>发布队列为空</p>
                    </div>
                  ) : (
                    publishQueue?.items?.map((item: any) => (
                      <Card key={item.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{item.group_name}</Badge>
                                <StatusBadge color={statusColorMap[item.status as keyof typeof statusColorMap] ?? "gray"}>
                                  {statusLabels[item.status] || item.status}
                                </StatusBadge>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                计划发布: {item.scheduled_at ? new Date(item.scheduled_at).toLocaleString() : "立即"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {item.status === "pending" && (
                                <Button
                                  size="sm"
                                  onClick={() => publishMessageMutation.mutate({ queueId: item.id })}
                                  disabled={publishMessageMutation.isPending}
                                >
                                  <Send className="w-4 h-4 mr-1" />
                                  立即发布
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 群组管理 */}
          <TabsContent value="groups" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups?.items?.map((group: any) => (
                <Card key={group.id} className="bg-card/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{group.group_name}</CardTitle>
                        <CardDescription>{group.platform}</CardDescription>
                      </div>
                      <Badge variant={group.is_active ? "default" : "secondary"}>
                        {group.is_active ? "活跃" : "停用"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">成员数</span>
                        <span>{group.member_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">消息数</span>
                        <span>{group.message_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">AI回复</span>
                        <span>{group.ai_enabled ? "已启用" : "未启用"}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Settings className="w-4 h-4 mr-1" />
                        设置
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Activity className="w-4 h-4 mr-1" />
                        统计
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* 审核对话框 */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>审核AI回复</DialogTitle>
              <DialogDescription>
                审核并修改AI生成的回复内容
              </DialogDescription>
            </DialogHeader>
            {selectedDraft && (
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-muted-foreground">原始问题</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg text-sm">
                    {selectedDraft.original_message}
                  </p>
                </div>
                <div>
                  <Label>回复内容（可编辑）</Label>
                  <Textarea
                    className="mt-1 min-h-[150px]"
                    defaultValue={selectedDraft.draft_content}
                    id="edited-content"
                  />
                </div>
                <div>
                  <Label>审核意见</Label>
                  <Textarea
                    className="mt-1"
                    placeholder="可选：填写审核意见或修改说明"
                    id="review-comment"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const comment = (document.getElementById("review-comment") as HTMLTextAreaElement)?.value;
                  reviewDraftMutation.mutate({
                    draftId: selectedDraft.id,
                    action: "reject",
                    comment,
                  });
                }}
                disabled={reviewDraftMutation.isPending}
              >
                拒绝
              </Button>
              <Button
                onClick={() => {
                  const editedContent = (document.getElementById("edited-content") as HTMLTextAreaElement)?.value;
                  const comment = (document.getElementById("review-comment") as HTMLTextAreaElement)?.value;
                  reviewDraftMutation.mutate({
                    draftId: selectedDraft.id,
                    action: "approve",
                    modifiedContent: editedContent,
                    comment,
                  });
                }}
                disabled={reviewDraftMutation.isPending}
              >
                批准并发布
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
