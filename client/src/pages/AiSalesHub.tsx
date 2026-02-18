/**
 * AI销售中心 - 谈判可视化、ZOPA图表、情绪分析、ZKP验证
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, Target, Brain, Shield, TrendingUp, Play, Pause, RotateCcw } from "lucide-react";
import { PageHeader, StatCard } from "@/components/grt";

const mockNegotiations = [
  { id: "neg_001", clientAgent: "上汽采购AI", round: 5, ourOffer: 125000, clientOffer: 98000, zopaMin: 105000, zopaMax: 130000, sentiment: "positive", status: "negotiating" },
  { id: "neg_002", clientAgent: "一汽采购AI", round: 8, ourOffer: 88000, clientOffer: 85000, zopaMin: 80000, zopaMax: 95000, sentiment: "neutral", status: "deal_reached" },
];

const mockZkpProofs = [
  { id: "zkp_001", type: "capacity", publicInputs: "年产能 > 10000套", proofHash: "0xabc...123", verified: true },
  { id: "zkp_002", type: "compliance", publicInputs: "VDA 6.3 认证", proofHash: "0xdef...456", verified: true },
  { id: "zkp_003", type: "green_energy", publicInputs: "绿电占比 > 60%", proofHash: "0xghi...789", verified: false },
];

export default function AiSalesHub() {
  const [activeTab, setActiveTab] = useState("negotiations");

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "text-green-400";
      case "negative": return "text-red-400";
      default: return "text-yellow-400";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessageSquare}
        title="AI销售中心"
        description="AI-to-AI谈判、ZOPA分析、情绪洞察"
        actions={<Button size="sm"><Play className="w-4 h-4 mr-2" />启动新谈判</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="进行中谈判" value={12} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Target} label="成交率" value="78%" iconColor="text-green-500" iconBg="bg-green-100" />
        <StatCard icon={Shield} label="ZKP验证" value={45} iconColor="text-blue-500" iconBg="bg-blue-100" />
        <StatCard icon={TrendingUp} label="本月成交额" value="¥2.8M" iconColor="text-purple-500" iconBg="bg-purple-100" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-card border border-border">
          <TabsTrigger value="negotiations"><MessageSquare className="w-4 h-4 mr-2" />谈判会话</TabsTrigger>
          <TabsTrigger value="zopa"><Target className="w-4 h-4 mr-2" />ZOPA分析</TabsTrigger>
          <TabsTrigger value="sentiment"><Brain className="w-4 h-4 mr-2" />情绪洞察</TabsTrigger>
          <TabsTrigger value="zkp"><Shield className="w-4 h-4 mr-2" />ZKP验证</TabsTrigger>
        </TabsList>

        <TabsContent value="negotiations" className="space-y-4">
          {mockNegotiations.map((neg) => (
            <Card key={neg.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{neg.clientAgent}</CardTitle>
                  <Badge variant={neg.status === "deal_reached" ? "default" : "secondary"}>
                    {neg.status === "deal_reached" ? "已成交" : `第${neg.round}轮`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">我方报价</p>
                    <p className="text-xl font-bold text-primary">¥{neg.ourOffer.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">客户还价</p>
                    <p className="text-xl font-bold">¥{neg.clientOffer.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">客户情绪:</span>
                  <span className={`font-medium ${getSentimentColor(neg.sentiment)}`}>
                    {neg.sentiment === "positive" ? "积极" : neg.sentiment === "negative" ? "消极" : "中性"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="zopa" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>ZOPA区间分析</CardTitle><CardDescription>协议达成可能区间可视化</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mockNegotiations.map((neg) => (
                  <div key={neg.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{neg.clientAgent}</span>
                      <span className="text-sm text-muted-foreground">ZOPA: ¥{neg.zopaMin.toLocaleString()} - ¥{neg.zopaMax.toLocaleString()}</span>
                    </div>
                    <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 bg-green-500/30" style={{ left: "30%", right: "20%" }} />
                      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full" style={{ left: "45%" }} />
                      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-400 rounded-full" style={{ left: "35%" }} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>¥80K</span><span>¥100K</span><span>¥120K</span><span>¥140K</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>情绪分析仪表盘</CardTitle><CardDescription>The Listener Agent实时情绪洞察</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">[情绪趋势图 - 按谈判轮次展示情绪变化]</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zkp" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>零知识证明注册表</CardTitle><CardDescription>产能/合规/绿色能源证明验证</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockZkpProofs.map((proof) => (
                  <div key={proof.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                      <Shield className={`w-8 h-8 ${proof.verified ? "text-green-400" : "text-yellow-400"}`} />
                      <div>
                        <p className="font-medium">{proof.type === "capacity" ? "产能证明" : proof.type === "compliance" ? "合规证明" : "绿色能源"}</p>
                        <p className="text-sm text-muted-foreground">{proof.publicInputs}</p>
                      </div>
                    </div>
                    <Badge variant={proof.verified ? "default" : "secondary"}>{proof.verified ? "已验证" : "待验证"}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
