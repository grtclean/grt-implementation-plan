/**
 * 液态用工中心 - 技能胶囊市场、任务竞标大厅、智能合约追踪
 */
import { useState } from "react";
import { toast } from "sonner";

const showPlaceholder = (featureName: string) => {
  toast.info('功能完善中', { description: `${featureName}功能正在开发完善中，敬请期待` });
};
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Briefcase, Award, Gavel, FileCheck, Search, Plus,
  TrendingUp
} from "lucide-react";

const mockSkillCapsules = [
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": case "released": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "pending": case "locked": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            液态用工中心
          </h1>
          <p className="text-muted-foreground mt-1">技能胶囊市场、任务竞标、智能合约管理</p>
        </div>
        <Button size="sm"><Plus className="w-4 h-4 mr-2" />发布技能</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">技能胶囊</p><p className="text-2xl font-bold text-primary">156</p></div>
              <Award className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">活跃竞标</p><p className="text-2xl font-bold text-green-400">23</p></div>
              <Gavel className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">执行中合约</p><p className="text-2xl font-bold text-blue-400">8</p></div>
              <FileCheck className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">本月收益</p><p className="text-2xl font-bold text-purple-400">¥45K</p></div>
              <TrendingUp className="w-8 h-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
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
            {mockSkillCapsules.map((skill) => (
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
                  <Button className="w-full" size="sm" onClick={() => showPlaceholder('调用技能')}>调用技能</Button>
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
    </div>
  );
}
