/**
 * AI销售中心增强版 - 谈判可视化、ZOPA计算、情绪分析
 */
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, BarChart3, Zap, MessageCircle, CheckCircle2, XCircle,
  ArrowUp, ArrowDown, Activity
} from "lucide-react";

// 谈判会话数据
const negotiationSessions = [
  { 
    id: "neg_001", 
    clientName: "上汽集团采购部", 
    round: 5, 
    ourOffer: 125000, 
    clientOffer: 118000, 
    sentiment: "positive",
    zopaMin: 110000,
    zopaMax: 130000,
    status: "negotiating"
  },
  { 
    id: "neg_002", 
    clientName: "一汽集团采购部", 
    round: 3, 
    ourOffer: 95000, 
    clientOffer: 92000, 
    sentiment: "neutral",
    zopaMin: 88000,
    zopaMax: 100000,
    status: "negotiating"
  },
];

// 情绪分析数据
const emotionAnalysis = [
  { sessionId: "neg_001", round: 1, sentiment: "neutral", score: 0.5 },
  { sessionId: "neg_001", round: 2, sentiment: "positive", score: 0.7 },
  { sessionId: "neg_001", round: 3, sentiment: "positive", score: 0.75 },
  { sessionId: "neg_001", round: 4, sentiment: "neutral", score: 0.55 },
  { sessionId: "neg_001", round: 5, sentiment: "positive", score: 0.72 },
];

export default function AiSalesHubEnhanced() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("sessions");
  const [selectedSession, setSelectedSession] = useState(negotiationSessions[0]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "text-green-400";
      case "neutral": return "text-yellow-400";
      case "negative": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "neutral": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "negative": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const sessionEmotions = emotionAnalysis.filter(e => e.sessionId === selectedSession.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            AI销售中心 (增强版)
          </h1>
          <p className="text-muted-foreground mt-1">AI谈判可视化、ZOPA计算、情绪分析</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />谈判会话
          </TabsTrigger>
          <TabsTrigger value="zopa" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />ZOPA分析
          </TabsTrigger>
          <TabsTrigger value="emotion" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />情绪分析
          </TabsTrigger>
        </TabsList>

        {/* 谈判会话 */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI谈判会话</CardTitle>
              <CardDescription>实时谈判轮次和报价跟踪</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {negotiationSessions.map((session) => (
                  <div 
                    key={session.id} 
                    className="p-4 bg-muted rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{session.clientName}</p>
                        <p className="text-sm text-muted-foreground">第 {session.round} 轮谈判</p>
                      </div>
                      <Badge className={getSentimentBadge(session.sentiment)}>
                        {session.sentiment === "positive" ? "积极" : session.sentiment === "neutral" ? "中立" : "消极"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">我方报价</p>
                        <p className="font-bold text-primary">¥{session.ourOffer.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">客户还价</p>
                        <p className="font-bold text-green-400">¥{session.clientOffer.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">价差</p>
                        <p className="font-bold text-yellow-400">¥{(session.ourOffer - session.clientOffer).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ZOPA分析 */}
        <TabsContent value="zopa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ZOPA区间分析</CardTitle>
              <CardDescription>{selectedSession.clientName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">协议达成区间 (ZOPA)</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>底价 (我方底线)</span>
                      <span className="font-bold text-primary">¥{selectedSession.zopaMin.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-yellow-500"
                        style={{
                          width: `${((selectedSession.zopaMax - selectedSession.zopaMin) / selectedSession.zopaMax) * 100}%`,
                          marginLeft: `${(selectedSession.zopaMin / selectedSession.zopaMax) * 100}%`
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>目标价 (理想价格)</span>
                      <span className="font-bold text-green-400">¥{selectedSession.zopaMax.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-xs text-muted-foreground">当前我方报价</p>
                    <p className="text-lg font-bold text-primary">¥{selectedSession.ourOffer.toLocaleString()}</p>
                    <p className="text-xs text-green-400 mt-1">在ZOPA区间内 ✓</p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <p className="text-xs text-muted-foreground">客户还价</p>
                    <p className="text-lg font-bold text-green-400">¥{selectedSession.clientOffer.toLocaleString()}</p>
                    <p className="text-xs text-yellow-400 mt-1">接近底价 ⚠</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline">降价建议</Button>
                  <Button className="flex-1">接受报价</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 情绪分析 */}
        <TabsContent value="emotion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>谈判情绪趋势</CardTitle>
              <CardDescription>{selectedSession.clientName} - 多轮谈判情绪变化</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-48 flex items-end justify-around gap-2 p-4 bg-muted rounded-lg">
                  {sessionEmotions.map((emotion, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div 
                        className={`w-12 rounded-t transition-all ${getSentimentColor(emotion.sentiment)} bg-current/20`}
                        style={{ height: `${emotion.score * 100}%` }}
                      />
                      <p className="text-xs text-muted-foreground">R{emotion.round}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {sessionEmotions.map((emotion, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">第 {emotion.round} 轮</span>
                      <div className="flex items-center gap-2">
                        <Badge className={getSentimentBadge(emotion.sentiment)} variant="outline">
                          {emotion.sentiment === "positive" ? "积极" : emotion.sentiment === "neutral" ? "中立" : "消极"}
                        </Badge>
                        <span className="text-sm font-medium">{(emotion.score * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
