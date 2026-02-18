/**
 * AI销售与智能谈判页面
 * 功能：AI-to-AI谈判会话、零知识证明验证、谈判策略配置
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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useState } from "react";
import {
  Bot, MessageSquare, Shield, CheckCircle, XCircle, Clock,
  TrendingUp, DollarSign, Handshake, AlertTriangle, RefreshCw,
  Plus, Eye, Activity, Target, Zap
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge, createStatusColorMap } from "@/components/grt";

const sessionStatusColorMap = createStatusColorMap({
  negotiating: "blue",
  deal_reached: "green",
  walk_away: "red",
});

const sessionStatusLabels: Record<string, string> = {
  negotiating: "谈判中",
  deal_reached: "已成交",
  walk_away: "已终止",
};

const zkpTypeColorMap = createStatusColorMap({
  capacity: "purple",
  compliance: "blue",
  green_energy: "green",
});

const zkpTypeLabels: Record<string, string> = {
  capacity: "产能证明",
  compliance: "合规证明",
  green_energy: "绿色能源",
};

export default function AISales() {
  const [activeTab, setActiveTab] = useState("sessions");
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showZkpDialog, setShowZkpDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  // 新建谈判会话表单
  const [newSession, setNewSession] = useState({
    clientAgentId: "",
    productId: "",
    floorPrice: "",
    targetPrice: "",
    maxRounds: "10",
  });

  // tRPC查询
  const { data: stats } = trpc.aiSales.getStats.useQuery();
  const { data: sessions, refetch: refetchSessions } = trpc.aiSales.getNegotiationSessions.useQuery({
    status: undefined,
    page: 1,
    pageSize: 20,
  });
  const { data: zkpRegistry } = (trpc.aiSales as any).getZkpRegistry.useQuery({
    page: 1,
    pageSize: 20,
  });

  // tRPC mutations
  const createSessionMutation = trpc.aiSales.createNegotiationSession.useMutation({
    onSuccess: () => {
      toast.success("谈判会话已创建");
      setShowNewSessionDialog(false);
      setNewSession({ clientAgentId: "", productId: "", floorPrice: "", targetPrice: "", maxRounds: "10" });
      refetchSessions();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const advanceNegotiationMutation = (trpc.aiSales as any).advanceNegotiation.useMutation({
    onSuccess: (data) => {
      if (data.status === "deal_reached") {
        toast.success("🎉 谈判成功！已达成协议");
      } else if (data.status === "walk_away") {
        toast.error("谈判终止：未能达成协议");
      } else {
        toast.info(`第 ${data.currentRound} 轮谈判完成`);
      }
      refetchSessions();
    },
    onError: (error) => {
      toast.error(`谈判失败: ${error.message}`);
    },
  });

  const generateZkpMutation = (trpc.aiSales as any).generateZkp.useMutation({
    onSuccess: () => {
      toast.success("ZKP证明已生成");
      setShowZkpDialog(false);
    },
    onError: (error) => {
      toast.error(`生成失败: ${error.message}`);
    },
  });

  // 计算ZOPA进度
  const calculateZopaProgress = (session: any) => {
    if (!session.zopa_range) return 0;
    const [floor, target] = session.zopa_range;
    const currentOffer = session.our_offer_price || floor;
    return Math.min(100, ((currentOffer - floor) / (target - floor)) * 100);
  };

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Bot}
          title="AI销售"
          description="AI-to-AI智能谈判、零知识证明验证"
          actions={
            <>
              <Dialog open={showZkpDialog} onOpenChange={setShowZkpDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Shield className="w-4 h-4 mr-2" />
                    生成ZKP
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>生成零知识证明</DialogTitle>
                    <DialogDescription>
                      向客户证明能力而不泄露敏感信息
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>证明类型</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="选择证明类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="capacity">产能证明</SelectItem>
                          <SelectItem value="compliance">合规证明 (VDA/IATF)</SelectItem>
                          <SelectItem value="green_energy">绿色能源证明</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>公开输入参数</Label>
                      <Textarea placeholder='如: {"standard": "VDA6.3", "score_range": [90, 100]}' />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowZkpDialog(false)}>
                      取消
                    </Button>
                    <Button onClick={() => generateZkpMutation.mutate({
                      proofType: "capacity",
                      publicInputs: {},
                    })}>
                      生成证明
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    新建谈判
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>创建AI谈判会话</DialogTitle>
                    <DialogDescription>
                      配置谈判参数，启动AI-to-AI自动谈判
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>客户Agent ID</Label>
                      <Input
                        value={newSession.clientAgentId}
                        onChange={(e) => setNewSession({ ...newSession, clientAgentId: e.target.value })}
                        placeholder="客户采购AI的标识"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>产品/项目</Label>
                      <Input
                        value={newSession.productId}
                        onChange={(e) => setNewSession({ ...newSession, productId: e.target.value })}
                        placeholder="谈判的产品或项目"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>底价 (元)</Label>
                        <Input
                          type="number"
                          value={newSession.floorPrice}
                          onChange={(e) => setNewSession({ ...newSession, floorPrice: e.target.value })}
                          placeholder="最低可接受价格"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>目标价 (元)</Label>
                        <Input
                          type="number"
                          value={newSession.targetPrice}
                          onChange={(e) => setNewSession({ ...newSession, targetPrice: e.target.value })}
                          placeholder="期望成交价格"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>最大谈判轮次</Label>
                      <Input
                        type="number"
                        value={newSession.maxRounds}
                        onChange={(e) => setNewSession({ ...newSession, maxRounds: e.target.value })}
                        placeholder="10"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewSessionDialog(false)}>
                      取消
                    </Button>
                    <Button
                      onClick={() => createSessionMutation.mutate({
                        clientAgentId: newSession.clientAgentId,
                        productId: parseInt(newSession.productId) || 0,
                        ourBottomPrice: parseFloat(newSession.floorPrice),
                        ourTargetPrice: parseFloat(newSession.targetPrice),
                        maxRounds: parseInt(newSession.maxRounds),
                      } as any)}
                      disabled={createSessionMutation.isPending}
                    >
                      {createSessionMutation.isPending ? "创建中..." : "开始谈判"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={MessageSquare} label="进行中谈判" value={(stats as any)?.activeNegotiations || 0} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
          <StatCard icon={Handshake} label="成交率" value={`${(stats as any)?.dealRate?.toFixed(1) || 0}%`} iconColor="text-green-400" iconBg="bg-green-500/10" />
          <StatCard icon={Shield} label="ZKP证明" value={(stats as any)?.zkpCount || 0} iconColor="text-purple-400" iconBg="bg-purple-500/10" />
          <StatCard icon={TrendingUp} label="平均轮次" value={(stats as any)?.avgRounds?.toFixed(1) || 0} iconColor="text-orange-400" iconBg="bg-orange-500/10" />
        </div>

        {/* 主要内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="sessions">
              <MessageSquare className="w-4 h-4 mr-2" />
              谈判会话
            </TabsTrigger>
            <TabsTrigger value="zkp">
              <Shield className="w-4 h-4 mr-2" />
              ZKP证明
            </TabsTrigger>
            <TabsTrigger value="strategy">
              <Target className="w-4 h-4 mr-2" />
              谈判策略
            </TabsTrigger>
          </TabsList>

          {/* 谈判会话 */}
          <TabsContent value="sessions" className="space-y-4">
            <div className="space-y-4">
              {sessions?.items?.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无谈判会话</p>
                    <p className="text-sm mt-2">点击"新建谈判"开始AI-to-AI自动谈判</p>
                  </CardContent>
                </Card>
              ) : (
                sessions?.items?.map((session: any) => (
                  <Card key={session.id} className="bg-card/50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Bot className="w-5 h-5" />
                            会话 #{session.id}
                            <StatusBadge color={sessionStatusColorMap[session.status as keyof typeof sessionStatusColorMap] ?? "gray"}>
                              {sessionStatusLabels[session.status] || session.status}
                            </StatusBadge>
                          </CardTitle>
                          <CardDescription>
                            客户Agent: {session.client_agent_id}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">第 {session.current_round} 轮</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* 报价对比 */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <p className="text-sm text-muted-foreground">我方报价</p>
                            <p className="text-xl font-bold text-green-400">
                              ¥{session.our_offer_price?.toLocaleString() || "待报价"}
                            </p>
                          </div>
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <p className="text-sm text-muted-foreground">客户还价</p>
                            <p className="text-xl font-bold text-blue-400">
                              ¥{session.client_counter_offer?.toLocaleString() || "待还价"}
                            </p>
                          </div>
                        </div>

                        {/* ZOPA进度 */}
                        {session.zopa_range && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">ZOPA区间</span>
                              <span>
                                ¥{session.zopa_range[0]?.toLocaleString()} - ¥{session.zopa_range[1]?.toLocaleString()}
                              </span>
                            </div>
                            <Progress value={calculateZopaProgress(session)} className="h-2" />
                          </div>
                        )}

                        {/* 情绪分析 */}
                        {session.sentiment_analysis && (
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">客户情绪分析</p>
                            <div className="flex gap-2">
                              <Badge variant="outline">
                                意愿度: {session.sentiment_analysis.willingness || "N/A"}
                              </Badge>
                              <Badge variant="outline">
                                紧迫感: {session.sentiment_analysis.urgency || "N/A"}
                              </Badge>
                              <Badge variant="outline">
                                信任度: {session.sentiment_analysis.trust || "N/A"}
                              </Badge>
                            </div>
                          </div>
                        )}

                        {/* 操作按钮 */}
                        {session.status === "negotiating" && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => advanceNegotiationMutation.mutate({ sessionId: session.id })}
                              disabled={advanceNegotiationMutation.isPending}
                              className="flex-1"
                            >
                              <Zap className="w-4 h-4 mr-2" />
                              继续谈判
                            </Button>
                            <Button variant="outline">
                              <Eye className="w-4 h-4 mr-2" />
                              查看详情
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* ZKP证明 */}
          <TabsContent value="zkp" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>零知识证明注册表</CardTitle>
                <CardDescription>
                  向客户证明能力而不泄露敏感信息
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {zkpRegistry?.items?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>暂无ZKP证明</p>
                    </div>
                  ) : (
                    zkpRegistry?.items?.map((zkp: any) => (
                      <Card key={zkp.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <StatusBadge color={zkpTypeColorMap[zkp.proof_type as keyof typeof zkpTypeColorMap] ?? "gray"}>
                                  {zkpTypeLabels[zkp.proof_type] || zkp.proof_type}
                                </StatusBadge>
                                {zkp.verified_by_client ? (
                                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    已验证
                                  </Badge>
                                ) : (
                                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                    <Clock className="w-3 h-3 mr-1" />
                                    待验证
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-mono text-muted-foreground">
                                {zkp.proof_hash?.slice(0, 40)}...
                              </p>
                              {zkp.public_inputs && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  公开输入: {JSON.stringify(zkp.public_inputs)}
                                </div>
                              )}
                            </div>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              详情
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 谈判策略 */}
          <TabsContent value="strategy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>谈判策略配置</CardTitle>
                <CardDescription>
                  配置AI谈判的默认策略和参数
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>默认让步策略</Label>
                      <Select defaultValue="gradual">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gradual">渐进让步</SelectItem>
                          <SelectItem value="aggressive">激进策略</SelectItem>
                          <SelectItem value="conservative">保守策略</SelectItem>
                          <SelectItem value="mirroring">镜像策略</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>情绪响应模式</Label>
                      <Select defaultValue="adaptive">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="adaptive">自适应</SelectItem>
                          <SelectItem value="empathetic">共情模式</SelectItem>
                          <SelectItem value="neutral">中立模式</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Walk-away阈值</Label>
                    <div className="flex items-center gap-4">
                      <Input type="number" defaultValue="3" className="w-24" />
                      <span className="text-sm text-muted-foreground">
                        连续拒绝次数后终止谈判
                      </span>
                    </div>
                  </div>
                  <Button onClick={() => toast.info('功能完善中', { description: '策略配置保存功能正在开发完善中，敬请期待' })}>保存策略配置</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
