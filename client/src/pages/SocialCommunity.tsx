/**
 * 社群管理与AI助手页面
 * 功能：微信群消息监听、AI回复草拟、人工审核发布
 */

import { useLanguage } from "@/contexts/LanguageContext";
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

export default function SocialCommunity() {
  const { t } = useLanguage();
  const statusLabels: Record<string, string> = {
    pending: t("common.social.statusPending"),
    approved: t("common.social.statusApproved"),
    rejected: t("common.social.statusRejected"),
    published: t("common.social.statusPublished"),
    failed: t("common.social.statusFailed"),
  };
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
      toast.success(t("common.social.groupCreated"));
      setShowCreateGroupDialog(false);
      setNewGroup({ groupName: "", platform: "wechat", groupId: "", description: "" });
    },
    onError: (error) => {
      toast.error(`${t("common.social.createFailed")}: ${error.message}`);
    },
  });

  const generateReplyMutation = (trpc.socialCommunity as any).generateAIReply.useMutation({
    onSuccess: () => {
      toast.success(t("common.social.aiReplyGenerated"));
      refetchDrafts();
    },
    onError: (error: any) => {
      toast.error(`${t("common.social.generateFailed")}: ${error.message}`);
    },
  });

  const reviewDraftMutation = trpc.socialCommunity.reviewDraft.useMutation({
    onSuccess: () => {
      toast.success(t("common.social.reviewComplete"));
      setShowReviewDialog(false);
      refetchDrafts();
      refetchQueue();
    },
    onError: (error) => {
      toast.error(`${t("common.social.reviewFailed")}: ${error.message}`);
    },
  });

  const publishMessageMutation = (trpc.socialCommunity as any).publishMessage.useMutation({
    onSuccess: () => {
      toast.success(t("common.social.messagePublished"));
      refetchQueue();
    },
    onError: (error: any) => {
      toast.error(`${t("common.social.publishFailed")}: ${error.message}`);
    },
  });

  return (
      <div className="space-y-6">
        <PageHeader
          icon={MessageSquare}
          title={t("common.social.title")}
          description={t("common.social.description")}
          actions={
            <>
              <Button variant="outline" onClick={() => refetchMessages()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("common.social.refresh")}
              </Button>
              <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("common.social.addGroup")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("common.social.addGroupTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("common.social.addGroupDesc")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{t("common.social.groupName")}</Label>
                      <Input
                        value={newGroup.groupName}
                        onChange={(e) => setNewGroup({ ...newGroup, groupName: e.target.value })}
                        placeholder={t("common.social.groupNamePlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("common.social.platform")}</Label>
                      <Select
                        value={newGroup.platform}
                        onValueChange={(v) => setNewGroup({ ...newGroup, platform: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wechat">{t("common.social.wechat")}</SelectItem>
                          <SelectItem value="dingtalk">{t("common.social.dingtalk")}</SelectItem>
                          <SelectItem value="feishu">{t("common.social.feishu")}</SelectItem>
                          <SelectItem value="telegram">Telegram</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("common.social.groupId")}</Label>
                      <Input
                        value={newGroup.groupId}
                        onChange={(e) => setNewGroup({ ...newGroup, groupId: e.target.value })}
                        placeholder={t("common.social.groupIdPlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("common.social.descriptionLabel")}</Label>
                      <Textarea
                        value={newGroup.description}
                        onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                        placeholder={t("common.social.descriptionPlaceholder")}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateGroupDialog(false)}>
                      {t("common.social.cancel")}
                    </Button>
                    <Button
                      onClick={() => createGroupMutation.mutate({ groupWxId: newGroup.groupId, name: newGroup.groupName, description: newGroup.description } as any)}
                      disabled={createGroupMutation.isPending}
                    >
                      {createGroupMutation.isPending ? t("common.social.creating") : t("common.social.create")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label={t("common.social.activeGroups")} value={stats?.activeGroups || 0} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
          <StatCard icon={MessageSquare} label={t("common.social.todayMessages")} value={stats?.todayMessages || 0} iconColor="text-green-400" iconBg="bg-green-500/10" />
          <StatCard icon={Clock} label={t("common.social.pendingReview")} value={stats?.pendingDrafts || 0} iconColor="text-yellow-400" iconBg="bg-yellow-500/10" />
          <StatCard icon={Bot} label={t("common.social.aiReplyRate")} value={`${stats?.aiReplyRate || 0}%`} iconColor="text-purple-400" iconBg="bg-purple-500/10" />
        </div>

        {/* 主要内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="messages">
              <MessageSquare className="w-4 h-4 mr-2" />
              {t("common.social.messageList")}
            </TabsTrigger>
            <TabsTrigger value="drafts">
              <Bot className="w-4 h-4 mr-2" />
              {t("common.social.aiDraftReview")}
              {(stats?.pendingDrafts || 0) > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                  {stats?.pendingDrafts}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="queue">
              <Send className="w-4 h-4 mr-2" />
              {t("common.social.publishQueue")}
            </TabsTrigger>
            <TabsTrigger value="groups">
              <Users className="w-4 h-4 mr-2" />
              {t("common.social.groupManagement")}
            </TabsTrigger>
          </TabsList>

          {/* 消息列表 */}
          <TabsContent value="messages" className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder={t("common.social.searchMessages")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-background"
                />
              </div>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t("common.social.selectGroup")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.social.allGroups")}</SelectItem>
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
                      <p>{t("common.social.noMessages")}</p>
                    </div>
                  ) : (
                    messages?.items?.map((msg: any) => (
                      <div key={msg.id} className="p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{msg.sender_name || t("common.social.unknownUser")}</span>
                              <Badge variant="outline" className="text-xs">
                                {msg.group_name || t("common.social.unknownGroup")}
                              </Badge>
                              {msg.is_question && (
                                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                  {t("common.social.question")}
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
                                {t("common.social.generateReply")}
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
                  {t("common.social.pendingDraftsTitle")}
                </CardTitle>
                <CardDescription>
                  {t("common.social.pendingDraftsDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {drafts?.items?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{t("common.social.noPendingDrafts")}</p>
                    </div>
                  ) : (
                    drafts?.items?.map((draft: any) => (
                      <Card key={draft.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">{t("common.social.originalQuestion")}</p>
                                <p className="text-sm">{draft.original_message}</p>
                              </div>
                              <StatusBadge color={statusColorMap[draft.status as keyof typeof statusColorMap] ?? "gray"}>
                                {statusLabels[draft.status] || draft.status}
                              </StatusBadge>
                            </div>
                            <div className="border-l-2 border-primary pl-4">
                              <p className="text-sm text-muted-foreground">{t("common.social.aiDraftReplyLabel")}</p>
                              <p className="text-sm whitespace-pre-wrap">{draft.draft_content}</p>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{t("common.social.confidence")}: {(draft.confidence_score * 100).toFixed(0)}%</span>
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
                                  {t("common.social.review")}
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
                  {t("common.social.publishQueueTitle")}
                </CardTitle>
                <CardDescription>
                  {t("common.social.publishQueueDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {publishQueue?.items?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{t("common.social.emptyQueue")}</p>
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
                                {t("common.social.scheduledPublish")}: {item.scheduled_at ? new Date(item.scheduled_at).toLocaleString() : t("common.social.immediately")}
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
                                  {t("common.social.publishNow")}
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
                        {group.is_active ? t("common.social.active") : t("common.social.disabled")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("common.social.memberCount")}</span>
                        <span>{group.member_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("common.social.messageCount")}</span>
                        <span>{group.message_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("common.social.aiReply")}</span>
                        <span>{group.ai_enabled ? t("common.social.aiEnabled") : t("common.social.aiDisabled")}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Settings className="w-4 h-4 mr-1" />
                        {t("common.social.settings")}
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Activity className="w-4 h-4 mr-1" />
                        {t("common.social.statistics")}
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
              <DialogTitle>{t("common.social.reviewAiReplyTitle")}</DialogTitle>
              <DialogDescription>
                {t("common.social.reviewAiReplyDesc")}
              </DialogDescription>
            </DialogHeader>
            {selectedDraft && (
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-muted-foreground">{t("common.social.originalQuestionLabel")}</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg text-sm">
                    {selectedDraft.original_message}
                  </p>
                </div>
                <div>
                  <Label>{t("common.social.replyContentEditable")}</Label>
                  <Textarea
                    className="mt-1 min-h-[150px]"
                    defaultValue={selectedDraft.draft_content}
                    id="edited-content"
                  />
                </div>
                <div>
                  <Label>{t("common.social.reviewComment")}</Label>
                  <Textarea
                    className="mt-1"
                    placeholder={t("common.social.reviewCommentPlaceholder")}
                    id="review-comment"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                {t("common.social.cancel")}
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
                {t("common.social.reject")}
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
                {t("common.social.approveAndPublish")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
