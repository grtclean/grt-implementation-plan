/**
 * 实时协作工作台页面
 * 
 * 功能：
 * 1. 多人同时编辑方案
 * 2. 共享文件
 * 3. 实时消息沟通
 * 4. 任务协作
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { 
  Edit3, 
  FileText, 
  FolderOpen, 
  MessageSquare, 
  Plus, 
  Send, 
  Share2, 
  Users, 
  Video,
  CheckSquare,
  Clock,
  Upload,
  Download,
  MoreVertical,
  Circle,
  Pencil,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff
} from "lucide-react";
import CollaborativeEditor from "@/components/CollaborativeEditor";

// 模拟工作区数据
const mockWorkspaces = [
  {
    id: "WS-001",
    name: "上海汽车零部件清洗线项目",
    description: "项目技术方案协作",
    members: [
      { id: "U1", name: "张工", avatar: "", role: "owner", online: true },
      { id: "U2", name: "李工", avatar: "", role: "editor", online: true },
      { id: "U3", name: "王工", avatar: "", role: "editor", online: false },
      { id: "U4", name: "赵工", avatar: "", role: "viewer", online: true },
    ],
    lastActivity: "2024-01-22 14:30",
    documentsCount: 12,
    tasksCount: 8,
  },
  {
    id: "WS-002",
    name: "新能源电池清洗设备研发",
    description: "研发团队协作空间",
    members: [
      { id: "U1", name: "张工", avatar: "", role: "owner", online: true },
      { id: "U5", name: "陈工", avatar: "", role: "editor", online: false },
    ],
    lastActivity: "2024-01-21 16:45",
    documentsCount: 8,
    tasksCount: 5,
  },
];

// 模拟文档数据
const mockDocuments = [
  { id: "DOC-001", name: "技术规格书 V2.1", type: "spec", updatedAt: "2024-01-22 14:30", updatedBy: "张工" },
  { id: "DOC-002", name: "设计方案评审记录", type: "review", updatedAt: "2024-01-22 10:15", updatedBy: "李工" },
  { id: "DOC-003", name: "BOM清单初稿", type: "bom", updatedAt: "2024-01-21 16:00", updatedBy: "王工" },
  { id: "DOC-004", name: "项目进度计划", type: "plan", updatedAt: "2024-01-20 09:30", updatedBy: "张工" },
];

// 模拟消息数据
const mockMessages = [
  { id: "M1", user: "张工", content: "大家好，今天下午3点开会讨论技术方案", time: "14:30", avatar: "" },
  { id: "M2", user: "李工", content: "收到，我会准备好设计图纸", time: "14:32", avatar: "" },
  { id: "M3", user: "王工", content: "BOM清单我已经更新了，请大家查看", time: "14:35", avatar: "" },
  { id: "M4", user: "赵工", content: "好的，我来审核一下", time: "14:38", avatar: "" },
];

// 模拟任务数据
const mockTasks = [
  { id: "T1", title: "完成技术规格书修订", assignee: "张工", status: "in_progress", dueDate: "2024-01-25" },
  { id: "T2", title: "设计图纸评审", assignee: "李工", status: "pending", dueDate: "2024-01-26" },
  { id: "T3", title: "BOM清单核对", assignee: "王工", status: "completed", dueDate: "2024-01-22" },
  { id: "T4", title: "成本预算编制", assignee: "赵工", status: "pending", dueDate: "2024-01-28" },
];

export default function CollaborationWorkspace() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("documents");
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(mockWorkspaces[0]);
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState(mockMessages);
  const [isNewWorkspaceOpen, setIsNewWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [searchQuery, setSearchQuery] = useState("");

  // tRPC 查询 - 如果API失败则回退到模拟数据
  const workspacesQuery = trpc.workspace.list.useQuery({ status: 'active', pageSize: 50 }, {
    enabled: !loading,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 500,
  });

  // 检查用户是否已完全认证（可以调用保护API）
  const isFullyAuthenticated = !!user && !workspacesQuery.isError;

  // tRPC 创建工作区 mutation
  const createWorkspaceMutation = trpc.workspace.create.useMutation({
    onSuccess: () => {
      toast.success("工作区创建成功");
      setIsNewWorkspaceOpen(false);
      setNewWorkspaceName("");
      setNewWorkspaceDesc("");
      workspacesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 邀请成员 mutation
  const inviteMemberMutation = trpc.workspace.inviteMember.useMutation({
    onSuccess: (data) => {
      if (data.status === 'added') {
        toast.success(`已成功添加 ${data.userName || data.email} 到工作区`);
      } else {
        toast.success(data.message || '邀请已发送');
      }
      setIsInviteOpen(false);
      setInviteEmail("");
      setSearchQuery("");
    },
    onError: (error) => {
      toast.error(`邀请失败: ${error.message}`);
    },
  });

  // 搜索用户 query
  const searchUsersQuery = trpc.workspace.searchUsers.useQuery(
    { query: searchQuery, workspaceId: selectedWorkspace?.dbId || 0 },
    { 
      enabled: searchQuery.length >= 2 && isInviteOpen && !!selectedWorkspace?.dbId,
      refetchOnWindowFocus: false,
    }
  );

  // 合并真实数据和模拟数据
  const realWorkspaces = (workspacesQuery.data?.items || []).map((w: any) => ({
    id: `WS-${w.id}`,
    dbId: w.id,
    name: w.name,
    description: w.description || '',
    members: [],
    lastActivity: w.last_activity_at || w.created_at,
    documentsCount: w.doc_count || 0,
    tasksCount: w.pending_tasks || 0,
    memberCount: w.member_count || 1,
    isReal: true,
  }));
  
  // 如果有真实数据则优先显示真实数据，否则显示模拟数据
  const allWorkspaces = realWorkspaces.length > 0 
    ? [...realWorkspaces, ...mockWorkspaces.map(w => ({ ...w, isReal: false }))]
    : mockWorkspaces.map(w => ({ ...w, isReal: false }));

  // 创建工作区
  const handleCreateWorkspace = () => {
    console.log("handleCreateWorkspace called", { newWorkspaceName, newWorkspaceDesc });
    if (!newWorkspaceName.trim()) {
      toast.error("请输入工作区名称");
      return;
    }
    
    // 如果用户未完全认证，显示提示
    if (!isFullyAuthenticated) {
      toast.info("演示模式：工作区已添加到本地列表（登录后可保存到服务器）");
      // 添加到本地模拟数据
      const newLocalWorkspace = {
        id: `WS-LOCAL-${Date.now()}`,
        name: newWorkspaceName,
        description: newWorkspaceDesc || '',
        members: [{ id: 'U0', name: user?.name || '我', avatar: '', role: 'owner', online: true }],
        lastActivity: new Date().toLocaleString('zh-CN'),
        documentsCount: 0,
        tasksCount: 0,
        isReal: false,
        isLocal: true,
      };
      mockWorkspaces.unshift(newLocalWorkspace);
      setSelectedWorkspace(newLocalWorkspace);
      setIsNewWorkspaceOpen(false);
      setNewWorkspaceName("");
      setNewWorkspaceDesc("");
      return;
    }
    
    console.log("Calling mutation...");
    createWorkspaceMutation.mutate({
      name: newWorkspaceName,
      description: newWorkspaceDesc || undefined,
      visibility: 'team',
    });
  };

  // 邀请成员
  const handleInviteMember = () => {
    if (!inviteEmail.trim()) {
      toast.error("请输入邮箱地址");
      return;
    }
    
    if (!isFullyAuthenticated) {
      toast.info("演示模式：请先登录后再邀请成员");
      return;
    }
    
    if (!selectedWorkspace?.dbId) {
      toast.error("请先选择一个工作区");
      return;
    }
    
    inviteMemberMutation.mutate({
      workspaceId: selectedWorkspace.dbId,
      email: inviteEmail,
      role: inviteRole,
    });
  };

  // 模拟发送消息
  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    
    const newMessage = {
      id: `M${messages.length + 1}`,
      user: user?.name || "我",
      content: messageInput,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      avatar: "",
    };
    
    setMessages([...messages, newMessage]);
    setMessageInput("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in_progress": return "bg-blue-500";
      case "pending": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "已完成";
      case "in_progress": return "进行中";
      case "pending": return "待处理";
      default: return "未知";
    }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Users}
          title="实时协作工作台"
          description="团队协作空间，支持多人同时编辑和实时沟通"
          actions={
            <>
              {/* 认证状态提示 */}
              {!isFullyAuthenticated && user && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 px-3 py-1.5 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span>演示模式</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                    onClick={() => window.location.href = getLoginUrl('/collaboration')}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    刷新认证
                  </Button>
                </div>
              )}
              <Dialog open={isNewWorkspaceOpen} onOpenChange={setIsNewWorkspaceOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    新建工作区
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新建协作工作区</DialogTitle>
                  <DialogDescription>
                    创建一个新的团队协作空间
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>工作区名称</Label>
                    <Input 
                      placeholder="输入工作区名称" 
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>描述</Label>
                    <Textarea 
                      placeholder="简要描述工作区用途" 
                      rows={3}
                      value={newWorkspaceDesc}
                      onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewWorkspaceOpen(false)}>
                    取消
                  </Button>
                  <Button 
                    type="button"
                    onClick={handleCreateWorkspace}
                    disabled={createWorkspaceMutation.isPending || !newWorkspaceName.trim()}
                  >
                    {createWorkspaceMutation.isPending ? "创建中..." : "创建"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 工作区列表 */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                我的工作区
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {workspacesQuery.isLoading && !workspacesQuery.isError ? (
                <div className="text-center py-4 text-muted-foreground text-sm">加载中...</div>
              ) : allWorkspaces.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">暂无工作区</div>
              ) : (
                allWorkspaces.map(ws => (
                  <div
                    key={ws.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedWorkspace?.id === ws.id 
                        ? "bg-primary/10 border border-primary/30" 
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedWorkspace(ws)}
                  >
                    <div className="font-medium text-sm truncate flex items-center gap-2">
                      {ws.name}
                      {ws.isReal && <Badge variant="outline" className="text-[10px] px-1 py-0">真实</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {ws.isReal ? `${(ws as any).memberCount || 1} 人` : `${ws.members?.filter((m: any) => m.online).length || 0} 人在线`}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 主工作区 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 工作区信息 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{selectedWorkspace.name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedWorkspace.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 在线成员头像 */}
                    <div className="flex -space-x-2">
                      {selectedWorkspace.members.filter(m => m.online).slice(0, 4).map(member => (
                        <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                          <AvatarFallback className="text-xs">{member.name[0]}</AvatarFallback>
                        </Avatar>
                      ))}
                      {selectedWorkspace.members.filter(m => m.online).length > 4 && (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                          +{selectedWorkspace.members.filter(m => m.online).length - 4}
                        </div>
                      )}
                    </div>
                    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Users className="h-4 w-4 mr-2" />
                          邀请
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>邀请成员</DialogTitle>
                          <DialogDescription>
                            通过邮箱邀请新成员加入工作区
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          {/* 搜索现有用户 */}
                          <div className="space-y-2">
                            <Label>搜索用户</Label>
                            <Input 
                              placeholder="输入用户名或邮箱搜索..." 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchUsersQuery.data && searchUsersQuery.data.length > 0 && (
                              <div className="border rounded-md max-h-40 overflow-y-auto">
                                {searchUsersQuery.data.map((u: any) => (
                                  <div 
                                    key={u.id}
                                    className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer"
                                    onClick={() => {
                                      setInviteEmail(u.email);
                                      setSearchQuery("");
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={u.avatar_url} />
                                        <AvatarFallback>{u.name?.[0] || u.email[0]}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="text-sm font-medium">{u.name || '未命名'}</p>
                                        <p className="text-xs text-muted-foreground">{u.email}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* 邮箱输入 */}
                          <div className="space-y-2">
                            <Label>邮箱地址</Label>
                            <Input 
                              type="email"
                              placeholder="输入邮箱地址" 
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                            />
                          </div>
                          
                          {/* 角色选择 */}
                          <div className="space-y-2">
                            <Label>成员角色</Label>
                            <div className="flex gap-2">
                              <Button 
                                type="button"
                                variant={inviteRole === 'viewer' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setInviteRole('viewer')}
                              >
                                查看者
                              </Button>
                              <Button 
                                type="button"
                                variant={inviteRole === 'editor' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setInviteRole('editor')}
                              >
                                编辑者
                              </Button>
                              <Button 
                                type="button"
                                variant={inviteRole === 'admin' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setInviteRole('admin')}
                              >
                                管理员
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {
                                inviteRole === 'viewer' ? '查看者可以查看文档和消息' :
                                inviteRole === 'editor' ? '编辑者可以编辑文档和任务' :
                                '管理员可以管理成员和设置'
                              }
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                            取消
                          </Button>
                          <Button 
                            onClick={handleInviteMember}
                            disabled={inviteMemberMutation.isPending || !inviteEmail.trim()}
                          >
                            {inviteMemberMutation.isPending ? "邀请中..." : "发送邀请"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm">
                      <Video className="h-4 w-4 mr-2" />
                      会议
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 功能标签页 */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  文档
                </TabsTrigger>
                <TabsTrigger value="editor" className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  协作编辑
                </TabsTrigger>
                <TabsTrigger value="tasks" className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  任务
                </TabsTrigger>
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  消息
                </TabsTrigger>
              </TabsList>

              {/* 文档 Tab */}
              <TabsContent value="documents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">共享文档</CardTitle>
                      <Button size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        上传文档
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {mockDocuments.map(doc => (
                        <div 
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.updatedBy} 更新于 {doc.updatedAt}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon"
                              onClick={() => toast.info(`编辑文档: ${doc.name}`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon"
                              onClick={() => toast.info(`下载文档: ${doc.name}`)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon"
                              onClick={() => toast.info(`分享文档: ${doc.name}`)}
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 协作编辑 Tab */}
              <TabsContent value="editor" className="space-y-4">
                {selectedWorkspace && user ? (
                  <CollaborativeEditor
                    workspaceId={selectedWorkspace.id}
                    documentId={1} // 默认文档ID，实际应从文档列表选择
                    documentName={`${selectedWorkspace.name} - 方案文档`}
                    userId={user.id}
                    userName={user.name || 'Anonymous'}
                    initialContent={`# ${selectedWorkspace.name}\n\n## 项目概述\n\n请在此处编辑项目方案...\n\n## 技术方案\n\n### 系统架构\n\n### 功能模块\n\n## 实施计划\n\n## 风险评估\n`}
                    onSave={async (content) => {
                      console.log('Saving document:', content.substring(0, 100));
                      // TODO: 调用API保存文档
                      toast.success('文档已保存');
                    }}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-16 text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {!user ? '请先登录以使用协作编辑功能' : '请选择一个工作区开始编辑'}
                      </p>
                      {!user && (
                        <Button className="mt-4" onClick={() => window.location.href = getLoginUrl()}>
                          登录
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* 任务 Tab */}
              <TabsContent value="tasks" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">任务列表</CardTitle>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        新建任务
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {mockTasks.map(task => (
                        <div 
                          key={task.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-3 w-3 rounded-full ${getStatusColor(task.status)}`} />
                            <div>
                              <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                                {task.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                负责人: {task.assignee} · 截止: {task.dueDate}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{getStatusText(task.status)}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 消息 Tab */}
              <TabsContent value="chat" className="space-y-4">
                <Card className="h-[500px] flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">团队消息</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ScrollArea className="flex-1 pr-4">
                      <div className="space-y-4">
                        {messages.map(msg => (
                          <div key={msg.id} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{msg.user[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{msg.user}</span>
                                <span className="text-xs text-muted-foreground">{msg.time}</span>
                              </div>
                              <p className="text-sm mt-1">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <Separator className="my-4" />
                    <div className="flex gap-2">
                      <Input 
                        placeholder="输入消息..." 
                        value={messageInput}
                        onChange={e => setMessageInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button onClick={handleSendMessage}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
  );
}
