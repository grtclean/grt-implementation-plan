/**
 * GRTclean技术交流社群管理页面
 * 基于《GRTclean技术交流社群管理规范与系统集成方案 v1.0》
 * 
 * 功能模块：
 * 1. 群成员管理 - 入群验证、画像标签、黑名单
 * 2. 知识推送库 - 技术文章、案例管理、审批发布
 * 3. 消息审批队列 - AI草拟、人工审核、发布
 * 4. 敏感词配置 - 拦截词库管理
 * 5. 统计仪表盘 - 社群运营数据
 */

import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Users, MessageSquare, BookOpen, Shield, BarChart3, 
  Plus, Check, X, Eye, Send, RefreshCw, AlertTriangle,
  UserCheck, UserX, Bot, FileText, Filter
} from "lucide-react";

export default function Community() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("members");
  
  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Users}
          title="社群管理"
          description="GRTclean技术交流群管理 - 物理连通，逻辑隔离，内容审批"
          actions={
            <Badge variant="outline" className="text-primary border-primary">
              Pilot D
            </Badge>
          }
        />

        {/* 统计卡片 */}
        <StatsCards />

        {/* 功能标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="members" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">群成员</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">知识推送</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">消息审批</span>
            </TabsTrigger>
            <TabsTrigger value="sensitive" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">敏感词</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">统计</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <MembersTab />
          </TabsContent>
          <TabsContent value="content">
            <ContentTab />
          </TabsContent>
          <TabsContent value="messages">
            <MessagesTab />
          </TabsContent>
          <TabsContent value="sensitive">
            <SensitiveWordsTab />
          </TabsContent>
          <TabsContent value="stats">
            <StatsTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// ============ 统计卡片组件 ============
function StatsCards() {
  const { data: stats, isLoading } = trpc.community.getStats.useQuery();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard icon={Users} label="活跃成员" value={isLoading ? "-" : ((stats as any)?.totalMembers || 0)} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
      <StatCard icon={MessageSquare} label="今日消息" value={isLoading ? "-" : ((stats as any)?.totalMessages || 0)} iconColor="text-green-500" iconBg="bg-green-500/10" />
      <StatCard icon={AlertTriangle} label="待审批" value={isLoading ? "-" : 0} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
      <StatCard icon={BarChart3} label="商机转化" value={isLoading ? "-" : ((stats as any)?.leadsGenerated || 0)} iconColor="text-primary" iconBg="bg-primary/10" />
    </div>
  );
}

// ============ 群成员管理标签页 ============
function MembersTab() {
  const { data, isLoading, refetch } = trpc.community.getMembers.useQuery();
  const verifyMutation = trpc.community.verifyMember.useMutation({
    onSuccess: () => {
      toast.success("成员验证状态已更新");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  
  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      guest: "bg-gray-500",
      employee: "bg-blue-500",
      tech_lead: "bg-green-500",
      sales_manager: "bg-purple-500",
      admin: "bg-red-500",
    };
    const labels: Record<string, string> = {
      guest: "访客",
      employee: "员工",
      tech_lead: "技术骨干",
      sales_manager: "销售经理",
      admin: "管理员",
    };
    return <Badge className={colors[role] || "bg-gray-500"}>{labels[role] || role}</Badge>;
  };
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      pending: "secondary",
      muted: "outline",
      banned: "destructive",
    };
    const labels: Record<string, string> = {
      active: "活跃",
      pending: "待验证",
      muted: "禁言",
      banned: "封禁",
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>群成员管理</CardTitle>
          <CardDescription>管理技术交流群成员，包括入群验证、画像标签、黑名单</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        ) : !(data as any)?.members?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无群成员数据
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>昵称</TableHead>
                <TableHead>平台</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>公司</TableHead>
                <TableHead>消息数</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as any).members.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.nickname}</TableCell>
                  <TableCell>{member.platform}</TableCell>
                  <TableCell>{getRoleBadge(member.role)}</TableCell>
                  <TableCell>{getStatusBadge(member.status)}</TableCell>
                  <TableCell>{member.company || "-"}</TableCell>
                  <TableCell>{member.messageCount || 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {member.verificationStatus === 'unverified' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => verifyMutation.mutate({ memberId: member.id, status: 'verified' })}
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => verifyMutation.mutate({ memberId: member.id, status: 'rejected' })}
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ============ 知识推送标签页 ============
function ContentTab() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newContent, setNewContent] = useState({
    title: "",
    summary: "",
    content: "",
    contentType: "article" as const,
    category: "",
  });
  
  const { data: contents, isLoading, refetch } = trpc.community.getPendingContent.useQuery();
  const createMutation = trpc.community.createContent.useMutation({
    onSuccess: () => {
      toast.success("内容已创建");
      setShowCreateDialog(false);
      setNewContent({ title: "", summary: "", content: "", contentType: "article", category: "" });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const approveMutation = trpc.community.approveContent.useMutation({
    onSuccess: () => {
      toast.success("内容已审批");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const publishMutation = trpc.community.publishContent.useMutation({
    onSuccess: () => {
      toast.success("内容已发布到社群");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  
  const getApprovalBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      approved: "default",
      draft: "secondary",
      pending_review: "outline",
      rejected: "destructive",
    };
    const labels: Record<string, string> = {
      approved: "已批准",
      draft: "草稿",
      pending_review: "待审核",
      rejected: "已拒绝",
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>知识推送库</CardTitle>
          <CardDescription>管理待推送的技术文章、清洗案例、每日一技</CardDescription>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              创建内容
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>创建知识内容</DialogTitle>
              <DialogDescription>创建技术文章或案例，将自动进行敏感词检查</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">标题</label>
                  <Input 
                    value={newContent.title}
                    onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                    placeholder="输入标题"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">类型</label>
                  <Select 
                    value={newContent.contentType}
                    onValueChange={(v) => setNewContent({ ...newContent, contentType: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="article">技术文章</SelectItem>
                      <SelectItem value="case_study">案例分享</SelectItem>
                      <SelectItem value="tip">每日一技</SelectItem>
                      <SelectItem value="faq">常见问题</SelectItem>
                      <SelectItem value="tutorial">教程</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">摘要</label>
                <Input 
                  value={newContent.summary}
                  onChange={(e) => setNewContent({ ...newContent, summary: e.target.value })}
                  placeholder="简短描述"
                />
              </div>
              <div>
                <label className="text-sm font-medium">内容</label>
                <Textarea 
                  value={newContent.content}
                  onChange={(e) => setNewContent({ ...newContent, content: e.target.value })}
                  placeholder="输入内容..."
                  rows={8}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
              <Button 
                onClick={() => createMutation.mutate({
                  ...newContent,
                  sourceType: "manual",
                })}
                disabled={!newContent.title || !newContent.content}
              >
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        ) : !contents?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无知识内容，点击"创建内容"添加
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>审批状态</TableHead>
                <TableHead>推送状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contents.map((content: any) => (
                <TableRow key={content.id}>
                  <TableCell className="font-medium">{content.title}</TableCell>
                  <TableCell>{content.contentType}</TableCell>
                  <TableCell>{getApprovalBadge(content.approvalStatus)}</TableCell>
                  <TableCell>
                    <Badge variant={content.pushStatus === 'published' ? 'default' : 'secondary'}>
                      {content.pushStatus === 'published' ? '已发布' : '未发布'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(content.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {content.approvalStatus === 'draft' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => approveMutation.mutate({ contentId: content.id, status: 'approved' })}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      {content.approvalStatus === 'approved' && content.pushStatus !== 'published' && (
                        <Button 
                          size="sm"
                          onClick={() => publishMutation.mutate({ contentId: content.id })}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          发布
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ============ 消息审批标签页 ============
function MessagesTab() {
  const { data: messages, isLoading, refetch } = trpc.community.getPendingMessages.useQuery();
  const approveMutation = trpc.community.approveOutboundMessage.useMutation({
    onSuccess: () => {
      toast.success("消息已审批");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>消息审批队列</CardTitle>
        <CardDescription>审核AI生成的回复草稿，确认后发布到社群</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        ) : !messages?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>暂无待审批消息</p>
            <p className="text-sm mt-2">当客户在群内提问时，AI会自动生成回复草稿</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg: any) => (
              <Card key={msg.id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {msg.messageType === 'reply' ? '回复' : msg.messageType}
                      </Badge>
                      {msg.aiConfidence && (
                        <Badge variant="secondary">
                          AI置信度: {(parseFloat(msg.aiConfidence) * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-background rounded-lg p-3 mb-3">
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.aiDraftContent && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">AI草稿</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.aiDraftContent}</p>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => approveMutation.mutate({ messageId: msg.id, status: 'rejected' })}
                    >
                      <X className="w-4 h-4 mr-1" />
                      拒绝
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => approveMutation.mutate({ messageId: msg.id, status: 'approved' })}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      批准发布
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ 敏感词配置标签页 ============
function SensitiveWordsTab() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newWord, setNewWord] = useState({
    word: "",
    category: "other" as const,
    severity: "medium" as const,
    matchType: "contains" as const,
    action: "block" as const,
  });
  
  const { data: words, isLoading, refetch } = trpc.community.getSensitiveWords.useQuery();
  const addMutation = trpc.community.addSensitiveWord.useMutation({
    onSuccess: () => {
      toast.success("敏感词已添加");
      setShowAddDialog(false);
      setNewWord({ word: "", category: "other", severity: "medium", matchType: "contains", action: "block" });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const initMutation = trpc.community.initDefaultSensitiveWords.useMutation({
    onSuccess: (data) => {
      toast.success(`已初始化${(data as any).count}个默认敏感词`);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  
  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      low: "bg-gray-500",
      medium: "bg-yellow-500",
      high: "bg-orange-500",
      critical: "bg-red-500",
    };
    return <Badge className={colors[severity] || "bg-gray-500"}>{severity}</Badge>;
  };
  
  const getActionBadge = (action: string) => {
    const labels: Record<string, string> = {
      warn: "警告",
      block: "拦截",
      replace: "替换",
      review: "审核",
    };
    return <Badge variant="outline">{labels[action] || action}</Badge>;
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>敏感词配置</CardTitle>
          <CardDescription>配置拦截词库，防止泄露底价、配方等敏感信息</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => initMutation.mutate()}>
            初始化默认词库
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                添加敏感词
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加敏感词</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">敏感词</label>
                  <Input 
                    value={newWord.word}
                    onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
                    placeholder="输入敏感词"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">分类</label>
                    <Select 
                      value={newWord.category}
                      onValueChange={(v) => setNewWord({ ...newWord, category: v as any })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">价格</SelectItem>
                        <SelectItem value="competitor">竞争对手</SelectItem>
                        <SelectItem value="formula">配方</SelectItem>
                        <SelectItem value="customer">客户信息</SelectItem>
                        <SelectItem value="internal">内部信息</SelectItem>
                        <SelectItem value="other">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">严重程度</label>
                    <Select 
                      value={newWord.severity}
                      onValueChange={(v) => setNewWord({ ...newWord, severity: v as any })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">低</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="critical">严重</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">处理方式</label>
                  <Select 
                    value={newWord.action}
                    onValueChange={(v) => setNewWord({ ...newWord, action: v as any })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warn">警告</SelectItem>
                      <SelectItem value="block">拦截</SelectItem>
                      <SelectItem value="replace">替换</SelectItem>
                      <SelectItem value="review">人工审核</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
                <Button 
                  onClick={() => addMutation.mutate({ ...newWord, isActive: true })}
                  disabled={!newWord.word}
                >
                  添加
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        ) : !words?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>暂无敏感词配置</p>
            <p className="text-sm mt-2">点击"初始化默认词库"添加常用敏感词</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>敏感词</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>严重程度</TableHead>
                <TableHead>匹配方式</TableHead>
                <TableHead>处理方式</TableHead>
                <TableHead>触发次数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {words.map((word: any) => (
                <TableRow key={word.id}>
                  <TableCell className="font-medium">{word.word}</TableCell>
                  <TableCell>{word.category}</TableCell>
                  <TableCell>{getSeverityBadge(word.severity)}</TableCell>
                  <TableCell>{word.matchType}</TableCell>
                  <TableCell>{getActionBadge(word.action)}</TableCell>
                  <TableCell>{word.triggerCount || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ============ 统计分析标签页 ============
function StatsTab() {
  const { data: stats, isLoading } = trpc.community.getStats.useQuery();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>社群统计</CardTitle>
        <CardDescription>社群运营数据分析</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-primary">{(stats as any)?.totalMembers || 0}</p>
                <p className="text-sm text-muted-foreground">总成员数</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-500">{(stats as any)?.totalMessages || 0}</p>
                <p className="text-sm text-muted-foreground">总消息数</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-500">{(stats as any)?.questionsAnswered || 0}</p>
                <p className="text-sm text-muted-foreground">已回答问题</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-yellow-500">{(stats as any)?.leadsGenerated || 0}</p>
                <p className="text-sm text-muted-foreground">商机转化</p>
              </CardContent>
            </Card>
          </div>
        )}
        
        <div className="mt-8 p-6 bg-muted/30 rounded-lg text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">详细统计图表功能开发中...</p>
          <p className="text-sm text-muted-foreground mt-2">
            将包含：成员增长趋势、消息活跃度、问题分类统计、响应时间分析
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
