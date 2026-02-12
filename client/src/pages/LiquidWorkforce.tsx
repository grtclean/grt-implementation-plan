/**
 * 液态用工与技能原子化页面
 * 功能：技能胶囊管理、任务竞标、智能合约支付
 */

import { useAuth } from "@/_core/hooks/useAuth";
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
import DashboardLayout from "@/components/DashboardLayout";

export default function LiquidWorkforce() {
  const { user } = useAuth();
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
      toast.success("技能胶囊创建成功");
      setShowCreateSkillDialog(false);
      setNewSkill({ name: "", level: "3", royaltyRate: "5", description: "" });
      refetchSkills();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const submitBidMutation = trpc.liquidWorkforce.submitBid.useMutation({
    onSuccess: () => {
      toast.success("竞标提交成功");
      setShowBidDialog(false);
      setBidForm({ bidPrice: "", promisedDeliveryDays: "", qualityCommitment: "" });
      refetchTasks();
    },
    onError: (error) => {
      toast.error(`竞标失败: ${error.message}`);
    },
  });

  // 状态徽章
  const getBidStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      accepted: "bg-green-500/20 text-green-400 border-green-500/30",
      rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    const labels: Record<string, string> = {
      pending: "待评审",
      accepted: "已中标",
      rejected: "未中标",
    };
    return (
      <Badge variant="outline" className={styles[status] || ""}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getContractStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      locked: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      released: "bg-green-500/20 text-green-400 border-green-500/30",
      disputed: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    const labels: Record<string, string> = {
      locked: "资金锁定",
      released: "已释放",
      disputed: "争议中",
    };
    return (
      <Badge variant="outline" className={styles[status] || ""}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">液态用工</h1>
            <p className="text-muted-foreground">
              技能原子化、任务竞标、智能合约支付
            </p>
          </div>
          <Dialog open={showCreateSkillDialog} onOpenChange={setShowCreateSkillDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                创建技能胶囊
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建技能胶囊</DialogTitle>
                <DialogDescription>
                  将您的专业技能原子化，参与任务竞标
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>技能名称</Label>
                  <Input
                    value={newSkill.name}
                    onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                    placeholder="如：高压喷嘴流体仿真"
                  />
                </div>
                <div className="space-y-2">
                  <Label>技能等级 (L1-L5)</Label>
                  <Select
                    value={newSkill.level}
                    onValueChange={(v) => setNewSkill({ ...newSkill, level: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">L1 - 入门级</SelectItem>
                      <SelectItem value="2">L2 - 基础级</SelectItem>
                      <SelectItem value="3">L3 - 熟练级</SelectItem>
                      <SelectItem value="4">L4 - 专家级</SelectItem>
                      <SelectItem value="5">L5 - 大师级</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>版税率 (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    value={newSkill.royaltyRate}
                    onChange={(e) => setNewSkill({ ...newSkill, royaltyRate: e.target.value })}
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground">
                    当您的技能被他人调用时，您将获得的版税比例
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>技能描述</Label>
                  <Textarea
                    value={newSkill.description}
                    onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                    placeholder="详细描述您的技能能力和应用场景"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateSkillDialog(false)}>
                  取消
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
                  {createSkillMutation.isPending ? "创建中..." : "创建"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">我的技能</p>
                  <p className="text-2xl font-bold">{(stats as any)?.mySkillCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">可竞标任务</p>
                  <p className="text-2xl font-bold">{(stats as any)?.openTasks || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10 text-green-400">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">累计收益</p>
                  <p className="text-2xl font-bold">¥{(stats as any)?.totalEarnings?.toLocaleString() || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-orange-500/10 text-orange-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">信誉分</p>
                  <p className="text-2xl font-bold">{(stats as any)?.creditScore?.toFixed(1) || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主要内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="skills">
              <Award className="w-4 h-4 mr-2" />
              技能胶囊
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <Briefcase className="w-4 h-4 mr-2" />
              任务竞标
            </TabsTrigger>
            <TabsTrigger value="bids">
              <BarChart3 className="w-4 h-4 mr-2" />
              我的竞标
            </TabsTrigger>
            <TabsTrigger value="contracts">
              <FileText className="w-4 h-4 mr-2" />
              智能合约
            </TabsTrigger>
          </TabsList>

          {/* 技能胶囊 */}
          <TabsContent value="skills" className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="搜索技能..."
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
                          {skill.owner_name || "未知所有者"}
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
                        <span className="text-muted-foreground">版税率</span>
                        <span className="font-medium">{skill.royalty_rate || 0}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">调用次数</span>
                        <span className="font-medium">{skill.usage_count || 0}</span>
                      </div>
                      {skill.validation_proof && (
                        <div className="flex items-center gap-2 text-sm text-green-400">
                          <Shield className="w-4 h-4" />
                          <span>ZKP已验证</span>
                        </div>
                      )}
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        <Eye className="w-4 h-4 mr-2" />
                        查看详情
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
                <CardTitle>可竞标任务</CardTitle>
                <CardDescription>
                  浏览并竞标适合您技能的任务
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks?.items?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>暂无可竞标任务</p>
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
                                  预算: ¥{task.budget?.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4 text-yellow-400" />
                                  截止: {task.deadline ? new Date(task.deadline).toLocaleDateString() : "无"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4 text-blue-400" />
                                  {task.bid_count || 0} 个竞标
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
                              竞标
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
                <CardTitle>我的竞标记录</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myBids?.items?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>暂无竞标记录</p>
                    </div>
                  ) : (
                    myBids?.items?.map((bid: any) => (
                      <Card key={bid.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{bid.task_title}</h4>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span>报价: ¥{bid.bid_price?.toLocaleString()}</span>
                                <span>AI评分: {bid.ai_judge_score?.toFixed(1) || "N/A"}</span>
                                <span>信誉分: {bid.credit_score_snapshot?.toFixed(1)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                提交时间: {new Date(bid.created_at).toLocaleString()}
                              </p>
                            </div>
                            {getBidStatusBadge(bid.status)}
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
                <CardTitle>智能合约账本</CardTitle>
                <CardDescription>
                  查看您参与的智能合约和支付状态
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contracts?.items?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>暂无智能合约</p>
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
                                {getContractStatusBadge(contract.execution_status)}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="flex items-center gap-1">
                                  <Coins className="w-4 h-4" />
                                  {contract.payment_type}: ¥{contract.amount?.toLocaleString()}
                                </span>
                              </div>
                              {contract.trigger_condition && (
                                <div className="mt-2 p-2 bg-background rounded text-xs">
                                  <span className="text-muted-foreground">触发条件: </span>
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
              <DialogTitle>提交竞标</DialogTitle>
              <DialogDescription>
                {selectedTask?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>报价 (元)</Label>
                <Input
                  type="number"
                  value={bidForm.bidPrice}
                  onChange={(e) => setBidForm({ ...bidForm, bidPrice: e.target.value })}
                  placeholder={`预算: ¥${selectedTask?.budget?.toLocaleString()}`}
                />
              </div>
              <div className="space-y-2">
                <Label>承诺交付天数</Label>
                <Input
                  type="number"
                  value={bidForm.promisedDeliveryDays}
                  onChange={(e) => setBidForm({ ...bidForm, promisedDeliveryDays: e.target.value })}
                  placeholder="如: 7"
                />
              </div>
              <div className="space-y-2">
                <Label>质量承诺</Label>
                <Textarea
                  value={bidForm.qualityCommitment}
                  onChange={(e) => setBidForm({ ...bidForm, qualityCommitment: e.target.value })}
                  placeholder="描述您的交付质量承诺..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBidDialog(false)}>
                取消
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
                {submitBidMutation.isPending ? "提交中..." : "提交竞标"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
