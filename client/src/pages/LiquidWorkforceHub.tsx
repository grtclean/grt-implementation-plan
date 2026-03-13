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
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
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
      toast.error(t("hr.liquidWorkforceHub.nameRequired"));
      return;
    }
    const rate = Number(formRoyaltyRate);
    if (formRoyaltyRate && (rate < 0 || rate > 100)) {
      toast.error(t("hr.liquidWorkforceHub.royaltyRateError"));
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
    toast.success(`${newSkill.name} — ${t("hr.liquidWorkforceHub.publishSuccess")}`);
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
        title={t("hr.liquidWorkforceHub.title")}
        description={t("hr.liquidWorkforceHub.description")}
        actions={<Button size="sm" onClick={() => setPublishOpen(true)}><Plus className="w-4 h-4 mr-2" />{t("hr.liquidWorkforceHub.publishSkill")}</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Award} label={t("hr.liquidWorkforceHub.skillCapsules")} value={156} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Gavel} label={t("hr.liquidWorkforceHub.activeBids")} value={23} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={FileCheck} label={t("hr.liquidWorkforceHub.activeContracts")} value={8} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={TrendingUp} label={t("hr.liquidWorkforceHub.monthlyEarnings")} value="¥45K" iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-card border border-border">
          <TabsTrigger value="skills" className="flex items-center gap-2"><Award className="w-4 h-4" />{t("hr.liquidWorkforceHub.tabSkillMarket")}</TabsTrigger>
          <TabsTrigger value="bids" className="flex items-center gap-2"><Gavel className="w-4 h-4" />{t("hr.liquidWorkforceHub.tabBidHall")}</TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-2"><FileCheck className="w-4 h-4" />{t("hr.liquidWorkforceHub.tabContractTracking")}</TabsTrigger>
          <TabsTrigger value="earnings" className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />{t("hr.liquidWorkforceHub.tabEarningsReport")}</TabsTrigger>
        </TabsList>

        <TabsContent value="skills" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t("hr.liquidWorkforceHub.searchSkillCapsules")} className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {skillCapsules.map((skill) => (
              <Card key={skill.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg">{skill.name}</CardTitle>
                  <CardDescription>{t("hr.liquidWorkforceHub.zkpProof")}: {skill.validationProof}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-muted-foreground">{t("hr.liquidWorkforceHub.royaltyRateLabel")}: {skill.royaltyRate}%</span>
                    <span className="text-muted-foreground">{t("hr.liquidWorkforceHub.usageLabel")}: {skill.usageCount}{t("hr.liquidWorkforceHub.usageSuffix")}</span>
                  </div>
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => toast.success(`${skill.name} — ${t("hr.liquidWorkforceHub.skillInvokeRequested")}`)}
                  >
                    {t("hr.liquidWorkforceHub.invokeSkill")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bids" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("hr.liquidWorkforceHub.bidPool")}</CardTitle><CardDescription>{t("hr.liquidWorkforceHub.bidPoolDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockTaskBids.map((bid) => (
                  <div key={bid.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                      <Gavel className="w-8 h-8 text-primary/50" />
                      <div>
                        <p className="font-medium">{bid.taskName}</p>
                        <p className="text-sm text-muted-foreground">{t("hr.liquidWorkforceHub.bidQuote")}: ¥{bid.bidPrice} · {t("hr.liquidWorkforceHub.sla")}: {bid.promisedSla}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <p>{t("hr.liquidWorkforceHub.creditScoreLabel")}: {bid.creditScore}</p>
                        <p className="text-primary">{t("hr.liquidWorkforceHub.aiScoreLabel")}: {bid.aiJudgeScore}</p>
                      </div>
                      <Badge className={getStatusColor(bid.status)}>{bid.status === "accepted" ? t("hr.liquidWorkforceHub.bidAccepted") : t("hr.liquidWorkforceHub.bidding")}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("hr.liquidWorkforceHub.contractLedger")}</CardTitle><CardDescription>{t("hr.liquidWorkforceHub.contractLedgerDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockContracts.map((contract) => (
                  <div key={contract.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                      <FileCheck className="w-8 h-8 text-primary/50" />
                      <div>
                        <p className="font-medium font-mono">{contract.address}</p>
                        <p className="text-sm text-muted-foreground">{t("hr.liquidWorkforceHub.triggerCondition")}: {contract.triggerCondition}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold">¥{contract.amount}</p>
                        <Badge variant="outline">{contract.paymentType}</Badge>
                      </div>
                      <Badge className={getStatusColor(contract.status)}>{contract.status === "locked" ? t("hr.liquidWorkforceHub.statusLocked") : t("hr.liquidWorkforceHub.statusReleased")}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("hr.liquidWorkforceHub.earningsReport")}</CardTitle><CardDescription>{t("hr.liquidWorkforceHub.earningsReportDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">{t("hr.liquidWorkforceHub.earningsChartPlaceholder")}</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 发布技能 Dialog */}
      <Dialog open={publishOpen} onOpenChange={(open) => { setPublishOpen(open); if (!open) resetPublishForm(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("hr.liquidWorkforceHub.publishSkillCapsule")}</DialogTitle>
            <DialogDescription>{t("hr.liquidWorkforceHub.publishSkillCapsuleDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="skillName">{t("hr.liquidWorkforceHub.skillNameRequired")}</Label>
              <Input
                id="skillName"
                placeholder={t("hr.liquidWorkforceHub.skillNamePlaceholder")}
                value={formSkillName}
                onChange={(e) => setFormSkillName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="royaltyRate">{t("hr.liquidWorkforceHub.royaltyRateRange")}</Label>
              <Input
                id="royaltyRate"
                type="number"
                placeholder="15"
                min={0}
                max={100}
                value={formRoyaltyRate}
                onChange={(e) => setFormRoyaltyRate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPublishOpen(false); resetPublishForm(); }}>{t("hr.liquidWorkforceHub.cancel")}</Button>
            <Button onClick={handlePublishSubmit}>{t("hr.liquidWorkforceHub.publishBtn")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
