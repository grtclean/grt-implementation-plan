/**
 * 液态用工与技能原子化页面
 * 功能：技能胶囊管理、任务竞标、智能合约支付
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
  Briefcase, Award, FileText, Coins, Users, TrendingUp,
  Plus, Search, Filter, Eye, CheckCircle, XCircle, Clock,
  Zap, Shield, DollarSign, BarChart3
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge, createStatusColorMap } from "@/components/grt";
import { useLanguage } from "@/contexts/LanguageContext";

const bidStatusColorMap = createStatusColorMap({
  pending: "yellow",
  accepted: "green",
  rejected: "red",
});

const bidStatusLabelKeys: Record<string, string> = {
  pending: "hr.liquidWorkforce.bidStatusPending",
  accepted: "hr.liquidWorkforce.bidStatusAccepted",
  rejected: "hr.liquidWorkforce.bidStatusRejected",
};

const contractStatusColorMap = createStatusColorMap({
  locked: "blue",
  released: "green",
  disputed: "red",
});

const contractStatusLabelKeys: Record<string, string> = {
  locked: "hr.liquidWorkforce.contractStatusLocked",
  released: "hr.liquidWorkforce.contractStatusReleased",
  disputed: "hr.liquidWorkforce.contractStatusDisputed",
};

export default function LiquidWorkforce() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("skills");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateSkillDialog, setShowCreateSkillDialog] = useState(false);
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // 新建技能胶囊表单
  const [newSkill, setNewSkill] = useState({
    name: "",
    level: "3",
    royaltyRate: "5",
    description: "",
  });

  // 竞标表单
  const [bidForm, setBidForm] = useState({
    bidPrice: "",
    promisedDeliveryDays: "",
    qualityCommitment: "",
  });

  // tRPC查询
  const { data: stats } = trpc.liquidWorkforce.getStats.useQuery();
  const { data: skills, refetch: refetchSkills } = trpc.liquidWorkforce.getSkillCapsules.useQuery({
    search: searchTerm || undefined,
    page: 1,
    pageSize: 20,
  });
  const { data: tasks, refetch: refetchTasks } = (trpc.liquidWorkforce as any).getAvailableTasks.useQuery({
    status: "open",
    page: 1,
    pageSize: 20,
  });
  const { data: myBids } = (trpc.liquidWorkforce as any).getMyBids.useQuery({
    page: 1,
    pageSize: 20,
  });
  const { data: contracts } = (trpc.liquidWorkforce as any).getContracts.useQuery({
    page: 1,
    pageSize: 20,
  });

  // tRPC mutations
  const createSkillMutation = trpc.liquidWorkforce.createSkillCapsule.useMutation({
    onSuccess: () => {
      toast.success(t("hr.liquidWorkforce.createSuccess"));
      setShowCreateSkillDialog(false);
      setNewSkill({ name: "", level: "3", royaltyRate: "5", description: "" });
      refetchSkills();
    },
    onError: (error) => {
      toast.error(`${t("hr.liquidWorkforce.createFailed")}: ${error.message}`);
    },
  });

  const submitBidMutation = trpc.liquidWorkforce.submitBid.useMutation({
    onSuccess: () => {
      toast.success(t("hr.liquidWorkforce.bidSubmitSuccess"));
      setShowBidDialog(false);
      setBidForm({ bidPrice: "", promisedDeliveryDays: "", qualityCommitment: "" });
      refetchTasks();
    },
    onError: (error) => {
      toast.error(`${t("hr.liquidWorkforce.bidSubmitFailed")}: ${error.message}`);
    },
  });

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Briefcase}
          title={t("hr.liquidWorkforce.title")}
          description={t("hr.liquidWorkforce.description")}
          actions={
            <Dialog open={showCreateSkillDialog} onOpenChange={setShowCreateSkillDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("hr.liquidWorkforce.createSkillCapsule")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("hr.liquidWorkforce.createSkillCapsule")}</DialogTitle>
                  <DialogDescription>
                    {t("hr.liquidWorkforce.createSkillCapsuleDesc")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t("hr.liquidWorkforce.skillName")}</Label>
                    <Input
                      value={newSkill.name}
                      onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                      placeholder={t("hr.liquidWorkforce.skillNamePlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("hr.liquidWorkforce.skillLevel")}</Label>
                    <Select
                      value={newSkill.level}
                      onValueChange={(v) => setNewSkill({ ...newSkill, level: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{t("hr.liquidWorkforce.levelBeginner")}</SelectItem>
                        <SelectItem value="2">{t("hr.liquidWorkforce.levelBasic")}</SelectItem>
                        <SelectItem value="3">{t("hr.liquidWorkforce.levelProficient")}</SelectItem>
                        <SelectItem value="4">{t("hr.liquidWorkforce.levelExpert")}</SelectItem>
                        <SelectItem value="5">{t("hr.liquidWorkforce.levelMaster")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("hr.liquidWorkforce.royaltyRate")}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="30"
                      value={newSkill.royaltyRate}
                      onChange={(e) => setNewSkill({ ...newSkill, royaltyRate: e.target.value })}
                      placeholder="5"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("hr.liquidWorkforce.royaltyRateHint")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("hr.liquidWorkforce.skillDescription")}</Label>
                    <Textarea
                      value={newSkill.description}
                      onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                      placeholder={t("hr.liquidWorkforce.skillDescPlaceholder")}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateSkillDialog(false)}>
                    {t("hr.liquidWorkforce.cancel")}
                  </Button>
                  <Button
                    onClick={() => createSkillMutation.mutate({
                      name: newSkill.name,
                      ownerDid: '',
                      level: parseInt(newSkill.level),
                      royaltyRate: parseFloat(newSkill.royaltyRate),
                      description: newSkill.description,
                    } as any)}
                    disabled={createSkillMutation.isPending}
                  >
                    {createSkillMutation.isPending ? t("hr.liquidWorkforce.creating") : t("hr.liquidWorkforce.create")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Award} label={t("hr.liquidWorkforce.mySkills")} value={(stats as any)?.mySkillCount || 0} iconColor="text-purple-400" iconBg="bg-purple-500/10" />
          <StatCard icon={Briefcase} label={t("hr.liquidWorkforce.availableTasks")} value={(stats as any)?.openTasks || 0} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
          <StatCard icon={Coins} label={t("hr.liquidWorkforce.totalEarnings")} value={`¥${(stats as any)?.totalEarnings?.toLocaleString() || 0}`} iconColor="text-green-400" iconBg="bg-green-500/10" />
          <StatCard icon={TrendingUp} label={t("hr.liquidWorkforce.creditScore")} value={(stats as any)?.creditScore?.toFixed(1) || "N/A"} iconColor="text-orange-400" iconBg="bg-orange-500/10" />
        </div>

        {/* 主要内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="skills">
              <Award className="w-4 h-4 mr-2" />
              {t("hr.liquidWorkforce.tabSkills")}
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <Briefcase className="w-4 h-4 mr-2" />
              {t("hr.liquidWorkforce.tabTasks")}
            </TabsTrigger>
            <TabsTrigger value="bids">
              <BarChart3 className="w-4 h-4 mr-2" />
              {t("hr.liquidWorkforce.tabBids")}
            </TabsTrigger>
            <TabsTrigger value="contracts">
              <FileText className="w-4 h-4 mr-2" />
              {t("hr.liquidWorkforce.tabContracts")}
            </TabsTrigger>
          </TabsList>

          {/* 技能胶囊 */}
          <TabsContent value="skills" className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder={t("hr.liquidWorkforce.searchSkills")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm bg-background"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills?.items?.map((skill: any) => (
                <Card key={skill.id} className="bg-card/50 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{skill.name}</CardTitle>
                        <CardDescription>
                          {skill.owner_name || t("hr.liquidWorkforce.unknownOwner")}
                        </CardDescription>
                      </div>
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        L{skill.level || 1}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("hr.liquidWorkforce.royaltyRateLabel")}</span>
                        <span className="font-medium">{skill.royalty_rate || 0}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("hr.liquidWorkforce.usageCount")}</span>
                        <span className="font-medium">{skill.usage_count || 0}</span>
                      </div>
                      {skill.validation_proof && (
                        <div className="flex items-center gap-2 text-sm text-green-400">
                          <Shield className="w-4 h-4" />
                          <span>{t("hr.liquidWorkforce.zkpVerified")}</span>
                        </div>
                      )}
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        <Eye className="w-4 h-4 mr-2" />
                        {t("hr.liquidWorkforce.viewDetails")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 任务竞标 */}
          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("hr.liquidWorkforce.availableTasksTitle")}</CardTitle>
                <CardDescription>
                  {t("hr.liquidWorkforce.browseAndBid")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks?.items?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{t("hr.liquidWorkforce.noAvailableTasks")}</p>
                    </div>
                  ) : (
                    tasks?.items?.map((task: any) => (
                      <Card key={task.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{task.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {task.description}
                              </p>
                              <div className="flex items-center gap-4 mt-3 text-sm">
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4 text-green-400" />
                                  {t("hr.liquidWorkforce.budget")}: ¥{task.budget?.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4 text-yellow-400" />
                                  {t("hr.liquidWorkforce.deadline")}: {task.deadline ? new Date(task.deadline).toLocaleDateString() : t("hr.liquidWorkforce.none")}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4 text-blue-400" />
                                  {task.bid_count || 0} {t("hr.liquidWorkforce.bidsCount")}
                                </span>
                              </div>
                              <div className="flex gap-2 mt-3">
                                {task.required_skills?.map((skill: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button
                              onClick={() => {
                                setSelectedTask(task);
                                setShowBidDialog(true);
                              }}
                            >
                              <Zap className="w-4 h-4 mr-2" />
                              {t("hr.liquidWorkforce.bid")}
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

          {/* 我的竞标 */}
          <TabsContent value="bids" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("hr.liquidWorkforce.myBidRecords")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myBids?.items?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{t("hr.liquidWorkforce.noBidRecords")}</p>
                    </div>
                  ) : (
                    myBids?.items?.map((bid: any) => (
                      <Card key={bid.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{bid.task_title}</h4>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span>{t("hr.liquidWorkforce.quote")}: ¥{bid.bid_price?.toLocaleString()}</span>
                                <span>{t("hr.liquidWorkforce.aiScore")}: {bid.ai_judge_score?.toFixed(1) || "N/A"}</span>
                                <span>{t("hr.liquidWorkforce.creditScoreLabel")}: {bid.credit_score_snapshot?.toFixed(1)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                {t("hr.liquidWorkforce.submitTime")}: {new Date(bid.created_at).toLocaleString()}
                              </p>
                            </div>
                            <StatusBadge color={bidStatusColorMap[bid.status as keyof typeof bidStatusColorMap] ?? "gray"}>
                              {bidStatusLabelKeys[bid.status] ? t(bidStatusLabelKeys[bid.status]) : bid.status}
                            </StatusBadge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 智能合约 */}
          <TabsContent value="contracts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("hr.liquidWorkforce.contractLedger")}</CardTitle>
                <CardDescription>
                  {t("hr.liquidWorkforce.contractLedgerDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contracts?.items?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{t("hr.liquidWorkforce.noContracts")}</p>
                    </div>
                  ) : (
                    contracts?.items?.map((contract: any) => (
                      <Card key={contract.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium font-mono text-sm">
                                  {contract.contract_address?.slice(0, 20)}...
                                </h4>
                                <StatusBadge color={contractStatusColorMap[contract.execution_status as keyof typeof contractStatusColorMap] ?? "gray"}>
                                  {contractStatusLabelKeys[contract.execution_status] ? t(contractStatusLabelKeys[contract.execution_status]) : contract.execution_status}
                                </StatusBadge>
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="flex items-center gap-1">
                                  <Coins className="w-4 h-4" />
                                  {contract.payment_type}: ¥{contract.amount?.toLocaleString()}
                                </span>
                              </div>
                              {contract.trigger_condition && (
                                <div className="mt-2 p-2 bg-background rounded text-xs">
                                  <span className="text-muted-foreground">{t("hr.liquidWorkforce.triggerCondition")}: </span>
                                  {JSON.stringify(contract.trigger_condition)}
                                </div>
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
        </Tabs>

        {/* 竞标对话框 */}
        <Dialog open={showBidDialog} onOpenChange={setShowBidDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("hr.liquidWorkforce.submitBid")}</DialogTitle>
              <DialogDescription>
                {selectedTask?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("hr.liquidWorkforce.bidPrice")}</Label>
                <Input
                  type="number"
                  value={bidForm.bidPrice}
                  onChange={(e) => setBidForm({ ...bidForm, bidPrice: e.target.value })}
                  placeholder={`${t("hr.liquidWorkforce.budget")}: ¥${selectedTask?.budget?.toLocaleString()}`}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("hr.liquidWorkforce.deliveryDays")}</Label>
                <Input
                  type="number"
                  value={bidForm.promisedDeliveryDays}
                  onChange={(e) => setBidForm({ ...bidForm, promisedDeliveryDays: e.target.value })}
                  placeholder="7"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("hr.liquidWorkforce.qualityCommitment")}</Label>
                <Textarea
                  value={bidForm.qualityCommitment}
                  onChange={(e) => setBidForm({ ...bidForm, qualityCommitment: e.target.value })}
                  placeholder={t("hr.liquidWorkforce.qualityCommitmentPlaceholder")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBidDialog(false)}>
                {t("hr.liquidWorkforce.cancel")}
              </Button>
              <Button
                onClick={() => submitBidMutation.mutate({
                  taskId: selectedTask?.id,
                  bidPrice: parseFloat(bidForm.bidPrice),
                  promisedSla: {
                    deliveryDays: parseInt(bidForm.promisedDeliveryDays),
                    qualityScore: 0,
                  },
                } as any)}
                disabled={submitBidMutation.isPending}
              >
                {submitBidMutation.isPending ? t("hr.liquidWorkforce.submitting") : t("hr.liquidWorkforce.submitBidBtn")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
