/**
 * 液态用工中心 - 技能胶囊市场、任务竞标大厅、智能合约追踪
 */
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, StatCard } from "@/components/grt";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Briefcase, Award, Gavel, FileCheck, Search, Plus,
  TrendingUp
} from "lucide-react";

const initialSkillCapsules = [
  { id: "sk_001", name: "高压喷嘴流体仿真 Level 5", ownerDid: "did:grt:user001", royaltyRate: 15, usageCount: 234, validationProof: "0x7a8b...3f2e" },
  { id: "sk_002", name: "PLC编程 Level 4", ownerDid: "did:grt:user002", royaltyRate: 12, usageCount: 156, validationProof: "0x9c4d...8a1b" },
  { id: "sk_003", name: "3D建模 Level 3", ownerDid: "did:grt:user003", royaltyRate: 10, usageCount: 89, validationProof: "0x2e5f...7c3d" },
];

const mockTaskBids = [
  { id: "bid_001", taskName: "清洗线PLC程序开发", bidPrice: 15000, promisedSla: "7天", creditScore: 4.8, aiJudgeScore: 92, status: "pending" },
  { id: "bid_002", taskName: "喷嘴组件3D建模", bidPrice: 8000, promisedSla: "5天", creditScore: 4.5, aiJudgeScore: 88, status: "accepted" },
];

const mockContracts = [
  { id: "ct_001", address: "0x1234...5678", paymentType: "e-CNY", triggerCondition: "quality_score > 90", status: "locked", amount: 15000 },
  { id: "ct_002", address: "0x2345...6789", paymentType: "USDT", triggerCondition: "delivery_on_time", status: "released", amount: 8000 },
];

export default function LiquidWorkforceHub() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("skills");
  const [searchQuery, setSearchQuery] = useState("");
  const [skillCapsules, setSkillCapsules] = useState(initialSkillCapsules);

  // 发布技能 Dialog 状态
  const [publishOpen, setPublishOpen] = useState(false);
  const [formSkillName, setFormSkillName] = useState('');
  const [formRoyaltyRate, setFormRoyaltyRate] = useState('');

  const resetPublishForm = () => {
    setFormSkillName('');
    setFormRoyaltyRate('');
  };

  const handlePublishSubmit = () => {
    if (!formSkillName) {
      toast.error('请填写技能名称');
      return;
    }
    const rate = Number(formRoyaltyRate);
    if (formRoyaltyRate && (rate < 0 || rate > 100)) {
      toast.error('分润比例须在 0~100 之间');
      return;
    }
    const newSkill = {
      id: `sk_${Date.now()}`,
      name: formSkillName,
      ownerDid: `did:grt:${user?.username ?? 'user'}`,
      royaltyRate: rate || 0,
      usageCount: 0,
      validationProof: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
    };
    setSkillCapsules((prev) => [newSkill, ...prev]);
    setPublishOpen(false);
    resetPublishForm();
    toast.success(`技能 "${newSkill.name}" 发布成功`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": case "released": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "pending": case "locked": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Briefcase}
        title="液态用工中心"
        description="技能胶囊市场、任务竞标、智能合约管理"
        actions={<Button size="sm" onClick={() => setPublishOpen(true)}><Plus className="w-4 h-4 mr-2" />发布技能</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Award} label="技能胶囊" value={156} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Gavel} label="活跃竞标" value={23} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={FileCheck} label="执行中合约" value={8} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={TrendingUp} label="本月收益" value="¥45K" iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-card border border-border">
          <TabsTrigger value="skills" className="flex items-center gap-2"><Award className="w-4 h-4" />技能市场</TabsTrigger>
          <TabsTrigger value="bids" className="flex items-center gap-2"><Gavel className="w-4 h-4" />竞标大厅</TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-2"><FileCheck className="w-4 h-4" />合约追踪</TabsTrigger>
          <TabsTrigger value="earnings" className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />收益报表</TabsTrigger>
        </TabsList>

        <TabsContent value="skills" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="搜索技能胶囊..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {skillCapsules.map((skill) => (
              <Card key={skill.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg">{skill.name}</CardTitle>
                  <CardDescription>ZKP证明: {skill.validationProof}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-muted-foreground">版税率: {skill.royaltyRate}%</span>
                    <span className="text-muted-foreground">调用: {skill.usageCount}次</span>
                  </div>
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => toast.success(`技能 "${skill.name}" 调用请求已发送`)}
                  >
                    调用技能
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bids" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>任务竞标池</CardTitle><CardDescription>AI评分辅助的智能竞标系统</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockTaskBids.map((bid) => (
                  <div key={bid.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                      <Gavel className="w-8 h-8 text-primary/50" />
                      <div>
                        <p className="font-medium">{bid.taskName}</p>
                        <p className="text-sm text-muted-foreground">报价: ¥{bid.bidPrice} · SLA: {bid.promisedSla}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <p>信誉分: {bid.creditScore}</p>
                        <p className="text-primary">AI评分: {bid.aiJudgeScore}</p>
                      </div>
                      <Badge className={getStatusColor(bid.status)}>{bid.status === "accepted" ? "已中标" : "竞标中"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>智能合约账本</CardTitle><CardDescription>链上合约执行状态追踪</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockContracts.map((contract) => (
                  <div key={contract.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                      <FileCheck className="w-8 h-8 text-primary/50" />
                      <div>
                        <p className="font-medium font-mono">{contract.address}</p>
                        <p className="text-sm text-muted-foreground">触发条件: {contract.triggerCondition}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold">¥{contract.amount}</p>
                        <Badge variant="outline">{contract.paymentType}</Badge>
                      </div>
                      <Badge className={getStatusColor(contract.status)}>{contract.status === "locked" ? "锁定中" : "已释放"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>收益报表</CardTitle><CardDescription>技能调用收益和版税统计</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">[收益趋势图 - 按月统计版税收入]</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 发布技能 Dialog */}
      <Dialog open={publishOpen} onOpenChange={(open) => { setPublishOpen(open); if (!open) resetPublishForm(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>发布技能胶囊</DialogTitle>
            <DialogDescription>填写技能信息，发布后将出现在技能市场中。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="skillName">技能名称 *</Label>
              <Input
                id="skillName"
                placeholder="如 高压喷嘴流体仿真 Level 5"
                value={formSkillName}
                onChange={(e) => setFormSkillName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="royaltyRate">分润比例 (0-100%)</Label>
              <Input
                id="royaltyRate"
                type="number"
                placeholder="如 15"
                min={0}
                max={100}
                value={formRoyaltyRate}
                onChange={(e) => setFormRoyaltyRate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPublishOpen(false); resetPublishForm(); }}>取消</Button>
            <Button onClick={handlePublishSubmit}>发布技能</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
