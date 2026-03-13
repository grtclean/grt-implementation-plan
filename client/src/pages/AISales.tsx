/**
 * AI销售与智能谈判页面
 * 功能：AI-to-AI谈判会话、零知识证明验证、谈判策略配置
 */

import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
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

const sessionStatusLabelKeys: Record<string, string> = {
  negotiating: "ai.sales.statusNegotiating",
  deal_reached: "ai.sales.statusDealReached",
  walk_away: "ai.sales.statusWalkAway",
};

const zkpTypeColorMap = createStatusColorMap({
  capacity: "purple",
  compliance: "blue",
  green_energy: "green",
});

const zkpTypeLabelKeys: Record<string, string> = {
  capacity: "ai.sales.zkpCapacity",
  compliance: "ai.sales.zkpCompliance",
  green_energy: "ai.sales.zkpGreenEnergy",
};

export default function AISales() {
  const { t } = useLanguage();
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
      toast.success(t("ai.sales.sessionCreated"));
      setShowNewSessionDialog(false);
      setNewSession({ clientAgentId: "", productId: "", floorPrice: "", targetPrice: "", maxRounds: "10" });
      refetchSessions();
    },
    onError: (error) => {
      toast.error(`${t("ai.sales.createFailed")}: ${error.message}`);
    },
  });

  const advanceNegotiationMutation = (trpc.aiSales as any).advanceNegotiation.useMutation({
    onSuccess: (data) => {
      if (data.status === "deal_reached") {
        toast.success(t("ai.sales.dealReachedToast"));
      } else if (data.status === "walk_away") {
        toast.error(t("ai.sales.walkAwayToast"));
      } else {
        toast.info(`${t("ai.sales.roundComplete")} ${data.currentRound}`);
      }
      refetchSessions();
    },
    onError: (error) => {
      toast.error(`${t("ai.sales.negotiationFailed")}: ${error.message}`);
    },
  });

  const generateZkpMutation = (trpc.aiSales as any).generateZkp.useMutation({
    onSuccess: () => {
      toast.success(t("ai.sales.zkpGenerated"));
      setShowZkpDialog(false);
    },
    onError: (error) => {
      toast.error(`${t("ai.sales.generateFailed")}: ${error.message}`);
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
          title={t("ai.sales.title")}
          description={t("ai.sales.description")}
          actions={
            <>
              <Dialog open={showZkpDialog} onOpenChange={setShowZkpDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Shield className="w-4 h-4 mr-2" />
                    {t("ai.sales.generateZKP")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("ai.sales.generateZKPTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("ai.sales.generateZKPDesc")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{t("ai.sales.proofType")}</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder={t("ai.sales.selectProofType")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="capacity">{t("ai.sales.zkpCapacity")}</SelectItem>
                          <SelectItem value="compliance">{t("ai.sales.zkpCompliance")} (VDA/IATF)</SelectItem>
                          <SelectItem value="green_energy">{t("ai.sales.zkpGreenEnergy")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("ai.sales.publicInputParams")}</Label>
                      <Textarea placeholder={t("ai.sales.zkpInputPlaceholder")} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowZkpDialog(false)}>
                      {t("ai.sales.cancel")}
                    </Button>
                    <Button onClick={() => generateZkpMutation.mutate({
                      proofType: "capacity",
                      publicInputs: {},
                    })}>
                      {t("ai.sales.generateProof")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("ai.sales.newNegotiation")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("ai.sales.createSessionTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("ai.sales.createSessionDesc")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{t("ai.sales.clientAgentId")}</Label>
                      <Input
                        value={newSession.clientAgentId}
                        onChange={(e) => setNewSession({ ...newSession, clientAgentId: e.target.value })}
                        placeholder={t("ai.sales.clientAgentIdPlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("ai.sales.productProject")}</Label>
                      <Input
                        value={newSession.productId}
                        onChange={(e) => setNewSession({ ...newSession, productId: e.target.value })}
                        placeholder={t("ai.sales.productProjectPlaceholder")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("ai.sales.floorPrice")}</Label>
                        <Input
                          type="number"
                          value={newSession.floorPrice}
                          onChange={(e) => setNewSession({ ...newSession, floorPrice: e.target.value })}
                          placeholder={t("ai.sales.floorPricePlaceholder")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("ai.sales.targetPrice")}</Label>
                        <Input
                          type="number"
                          value={newSession.targetPrice}
                          onChange={(e) => setNewSession({ ...newSession, targetPrice: e.target.value })}
                          placeholder={t("ai.sales.targetPricePlaceholder")}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("ai.sales.maxRounds")}</Label>
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
                      {t("ai.sales.cancel")}
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
                      {createSessionMutation.isPending ? t("ai.sales.creating") : t("ai.sales.startNegotiation")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={MessageSquare} label={t("ai.sales.activeNegotiations")} value={(stats as any)?.activeNegotiations || 0} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
          <StatCard icon={Handshake} label={t("ai.sales.dealRate")} value={`${(stats as any)?.dealRate?.toFixed(1) || 0}%`} iconColor="text-green-400" iconBg="bg-green-500/10" />
          <StatCard icon={Shield} label={t("ai.sales.zkpProofs")} value={(stats as any)?.zkpCount || 0} iconColor="text-purple-400" iconBg="bg-purple-500/10" />
          <StatCard icon={TrendingUp} label={t("ai.sales.avgRounds")} value={(stats as any)?.avgRounds?.toFixed(1) || 0} iconColor="text-orange-400" iconBg="bg-orange-500/10" />
        </div>

        {/* 主要内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="sessions">
              <MessageSquare className="w-4 h-4 mr-2" />
              {t("ai.sales.tabSessions")}
            </TabsTrigger>
            <TabsTrigger value="zkp">
              <Shield className="w-4 h-4 mr-2" />
              {t("ai.sales.tabZKP")}
            </TabsTrigger>
            <TabsTrigger value="strategy">
              <Target className="w-4 h-4 mr-2" />
              {t("ai.sales.tabStrategy")}
            </TabsTrigger>
          </TabsList>

          {/* 谈判会话 */}
          <TabsContent value="sessions" className="space-y-4">
            <div className="space-y-4">
              {sessions?.items?.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t("ai.sales.noSessions")}</p>
                    <p className="text-sm mt-2">{t("ai.sales.noSessionsHint")}</p>
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
                            {t("ai.sales.session")} #{session.id}
                            <StatusBadge color={sessionStatusColorMap[session.status as keyof typeof sessionStatusColorMap] ?? "gray"}>
                              {sessionStatusLabelKeys[session.status] ? t(sessionStatusLabelKeys[session.status]) : session.status}
                            </StatusBadge>
                          </CardTitle>
                          <CardDescription>
                            {t("ai.sales.clientAgent")}: {session.client_agent_id}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">{t("ai.sales.round")} {session.current_round}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* 报价对比 */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <p className="text-sm text-muted-foreground">{t("ai.sales.ourOffer")}</p>
                            <p className="text-xl font-bold text-green-400">
                              ¥{session.our_offer_price?.toLocaleString() || t("ai.sales.pendingOffer")}
                            </p>
                          </div>
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <p className="text-sm text-muted-foreground">{t("ai.sales.clientCounter")}</p>
                            <p className="text-xl font-bold text-blue-400">
                              ¥{session.client_counter_offer?.toLocaleString() || t("ai.sales.pendingCounter")}
                            </p>
                          </div>
                        </div>

                        {/* ZOPA进度 */}
                        {session.zopa_range && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">{t("ai.sales.zopaRange")}</span>
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
                            <p className="text-sm text-muted-foreground mb-2">{t("ai.sales.sentimentAnalysis")}</p>
                            <div className="flex gap-2">
                              <Badge variant="outline">
                                {t("ai.sales.willingness")}: {session.sentiment_analysis.willingness || "N/A"}
                              </Badge>
                              <Badge variant="outline">
                                {t("ai.sales.urgency")}: {session.sentiment_analysis.urgency || "N/A"}
                              </Badge>
                              <Badge variant="outline">
                                {t("ai.sales.trust")}: {session.sentiment_analysis.trust || "N/A"}
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
                              {t("ai.sales.continueNegotiation")}
                            </Button>
                            <Button variant="outline">
                              <Eye className="w-4 h-4 mr-2" />
                              {t("ai.sales.viewDetails")}
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
                <CardTitle>{t("ai.sales.zkpRegistry")}</CardTitle>
                <CardDescription>
                  {t("ai.sales.zkpRegistryDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {zkpRegistry?.items?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{t("ai.sales.noZKP")}</p>
                    </div>
                  ) : (
                    zkpRegistry?.items?.map((zkp: any) => (
                      <Card key={zkp.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <StatusBadge color={zkpTypeColorMap[zkp.proof_type as keyof typeof zkpTypeColorMap] ?? "gray"}>
                                  {zkpTypeLabelKeys[zkp.proof_type] ? t(zkpTypeLabelKeys[zkp.proof_type]) : zkp.proof_type}
                                </StatusBadge>
                                {zkp.verified_by_client ? (
                                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {t("ai.sales.verified")}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {t("ai.sales.pendingVerification")}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-mono text-muted-foreground">
                                {zkp.proof_hash?.slice(0, 40)}...
                              </p>
                              {zkp.public_inputs && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  {t("ai.sales.publicInputs")}: {JSON.stringify(zkp.public_inputs)}
                                </div>
                              )}
                            </div>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              {t("ai.sales.details")}
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
                <CardTitle>{t("ai.sales.strategyConfig")}</CardTitle>
                <CardDescription>
                  {t("ai.sales.strategyConfigDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>{t("ai.sales.defaultConcessionStrategy")}</Label>
                      <Select defaultValue="gradual">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gradual">{t("ai.sales.strategyGradual")}</SelectItem>
                          <SelectItem value="aggressive">{t("ai.sales.strategyAggressive")}</SelectItem>
                          <SelectItem value="conservative">{t("ai.sales.strategyConservative")}</SelectItem>
                          <SelectItem value="mirroring">{t("ai.sales.strategyMirroring")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("ai.sales.emotionResponseMode")}</Label>
                      <Select defaultValue="adaptive">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="adaptive">{t("ai.sales.modeAdaptive")}</SelectItem>
                          <SelectItem value="empathetic">{t("ai.sales.modeEmpathetic")}</SelectItem>
                          <SelectItem value="neutral">{t("ai.sales.modeNeutral")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("ai.sales.walkAwayThreshold")}</Label>
                    <div className="flex items-center gap-4">
                      <Input type="number" defaultValue="3" className="w-24" />
                      <span className="text-sm text-muted-foreground">
                        {t("ai.sales.walkAwayThresholdDesc")}
                      </span>
                    </div>
                  </div>
                  <Button onClick={() => toast.info(t("ai.sales.featureInProgress"), { description: t("ai.sales.featureInProgressDesc") })}>{t("ai.sales.saveStrategy")}</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
