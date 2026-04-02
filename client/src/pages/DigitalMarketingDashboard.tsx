/**
 * 数字营销仪表盘 — 市场营销人员统一分析入口
 * 线索来源归因 · 展会ROI · 内容营销 · 漏斗转化 · 获客成本
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart3, TrendingUp, Target, Users, Globe, Megaphone, Eye, MousePointer,
  DollarSign, ArrowRight, ArrowDown, Calendar, Award, Zap, Filter, Share2
} from "lucide-react";

// ── Marketing Analytics Data ──
const CHANNEL_PERFORMANCE = [
  { channel: "展会/行业峰会", icon: Award, leads: 42, opportunities: 18, won: 6, revenue: 5800000, spend: 380000, color: "bg-purple-500" },
  { channel: "百度SEM/SEO", icon: Globe, leads: 85, opportunities: 12, won: 3, revenue: 1200000, spend: 120000, color: "bg-blue-500" },
  { channel: "官网表单", icon: MousePointer, leads: 38, opportunities: 8, won: 2, revenue: 900000, spend: 25000, color: "bg-green-500" },
  { channel: "客户转介绍", icon: Share2, leads: 22, opportunities: 15, won: 8, revenue: 4200000, spend: 0, color: "bg-orange-500" },
  { channel: "LinkedIn/领英", icon: Users, leads: 15, opportunities: 4, won: 1, revenue: 550000, spend: 45000, color: "bg-sky-500" },
  { channel: "行业媒体投放", icon: Megaphone, leads: 28, opportunities: 5, won: 1, revenue: 320000, spend: 85000, color: "bg-pink-500" },
];

const EXHIBITIONS = [
  { name: "2026上海汽车零部件展(APS)", date: "2026-03-15", booth: "N3-B128", visitors: 320, leads: 28, hotLeads: 8, spend: 180000, revenue: 2800000, status: "completed" },
  { name: "CIMT2026中国机床展", date: "2026-04-21", booth: "W4-A056", visitors: 0, leads: 0, hotLeads: 0, spend: 120000, revenue: 0, status: "upcoming" },
  { name: "2025上海清洗技术展(CLEAN)", date: "2025-11-20", booth: "E2-C215", visitors: 185, leads: 15, hotLeads: 5, spend: 95000, revenue: 1500000, status: "completed" },
  { name: "2025慕尼黑华南电子展", date: "2025-10-08", booth: "H1-1088", visitors: 210, leads: 18, hotLeads: 6, spend: 110000, revenue: 980000, status: "completed" },
];

const FUNNEL_STAGES = [
  { stage: "访客/曝光", count: 12500, rate: 100, color: "bg-gray-200" },
  { stage: "线索(MQL)", count: 230, rate: 1.8, color: "bg-blue-200" },
  { stage: "商机(SQL)", count: 62, rate: 27, color: "bg-indigo-300" },
  { stage: "报价", count: 35, rate: 56, color: "bg-purple-400" },
  { stage: "谈判", count: 18, rate: 51, color: "bg-orange-400" },
  { stage: "签约", count: 12, rate: 67, color: "bg-green-500" },
];

const CONTENT_METRICS = [
  { type: "产品手册(PDF)", views: 1250, downloads: 380, leads: 22, topItem: "GRT-S3超声波清洗机技术方案" },
  { type: "案例视频", views: 8500, downloads: 0, leads: 15, topItem: "大众汽车齿轮轴清洗线案例" },
  { type: "技术白皮书", views: 620, downloads: 185, leads: 12, topItem: "清洁度VDA 19标准解读" },
  { type: "在线演示/Webinar", views: 450, downloads: 0, leads: 8, topItem: "半导体级超纯水清洗技术" },
];

export default function DigitalMarketingDashboard() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");

  const totalLeads = CHANNEL_PERFORMANCE.reduce((s, c) => s + c.leads, 0);
  const totalRevenue = CHANNEL_PERFORMANCE.reduce((s, c) => s + c.revenue, 0);
  const totalSpend = CHANNEL_PERFORMANCE.reduce((s, c) => s + c.spend, 0);
  const totalWon = CHANNEL_PERFORMANCE.reduce((s, c) => s + c.won, 0);
  const overallROI = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend * 100).toFixed(0) : 0;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-pink-600" />
            {language === "zh" ? "数字营销仪表盘" : "Digital Marketing Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === "zh" ? "渠道归因 · 展会ROI · 漏斗转化 · 内容效果 · 获客成本" : "Attribution · Exhibition ROI · Funnel · Content · CAC"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-1" /> 2026 Q1</Button>
          <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1" /> {language === "zh" ? "筛选" : "Filter"}</Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: language === "zh" ? "总线索" : "Leads", value: totalLeads, icon: Target, color: "text-blue-600", sub: "+18% vs Q4" },
          { label: language === "zh" ? "签约数" : "Won", value: totalWon, icon: Award, color: "text-green-600", sub: `¥${(totalRevenue / 10000).toFixed(0)}万` },
          { label: language === "zh" ? "营销ROI" : "ROI", value: `${overallROI}%`, icon: TrendingUp, color: "text-orange-600", sub: `投入¥${(totalSpend / 10000).toFixed(0)}万` },
          { label: language === "zh" ? "获客成本" : "CAC", value: `¥${totalWon > 0 ? (totalSpend / totalWon / 1000).toFixed(1) : 0}K`, icon: DollarSign, color: "text-red-600", sub: language === "zh" ? "per成交客户" : "per won" },
          { label: language === "zh" ? "线索→商机" : "MQL→SQL", value: "27%", icon: ArrowRight, color: "text-indigo-600", sub: "62/230" },
          { label: language === "zh" ? "商机→签约" : "SQL→Won", value: "19%", icon: Zap, color: "text-purple-600", sub: "12/62" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <kpi.icon className={`h-5 w-5 ${kpi.color} opacity-60`} />
                <div>
                  <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                  <p className="text-[10px] text-green-600">{kpi.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview"><BarChart3 className="h-3.5 w-3.5 mr-1" /> {language === "zh" ? "渠道分析" : "Channels"}</TabsTrigger>
          <TabsTrigger value="funnel"><ArrowDown className="h-3.5 w-3.5 mr-1" /> {language === "zh" ? "漏斗转化" : "Funnel"}</TabsTrigger>
          <TabsTrigger value="exhibitions"><Award className="h-3.5 w-3.5 mr-1" /> {language === "zh" ? "展会管理" : "Exhibitions"}</TabsTrigger>
          <TabsTrigger value="content"><Eye className="h-3.5 w-3.5 mr-1" /> {language === "zh" ? "内容营销" : "Content"}</TabsTrigger>
        </TabsList>

        {/* Channel Attribution */}
        <TabsContent value="overview" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "zh" ? "渠道" : "Channel"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "线索" : "Leads"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "商机" : "Opps"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "成交" : "Won"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "成交额" : "Revenue"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "投入" : "Spend"}</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead>{language === "zh" ? "转化率" : "Conv"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CHANNEL_PERFORMANCE.sort((a, b) => b.revenue - a.revenue).map(ch => {
                  const roi = ch.spend > 0 ? ((ch.revenue - ch.spend) / ch.spend * 100) : (ch.revenue > 0 ? 999 : 0);
                  const conv = ch.leads > 0 ? (ch.won / ch.leads * 100).toFixed(0) : 0;
                  return (
                    <TableRow key={ch.channel}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-8 rounded-full ${ch.color}`} />
                          <div className="flex items-center gap-1.5">
                            <ch.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{ch.channel}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{ch.leads}</TableCell>
                      <TableCell className="text-right">{ch.opportunities}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">{ch.won}</TableCell>
                      <TableCell className="text-right font-bold">¥{(ch.revenue / 10000).toFixed(0)}万</TableCell>
                      <TableCell className="text-right text-muted-foreground">¥{ch.spend > 0 ? (ch.spend / 10000).toFixed(1) + "万" : "0"}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={`text-xs ${roi >= 500 ? "bg-green-100 text-green-700" : roi >= 100 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                          {roi >= 999 ? "∞" : roi + "%"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Progress value={Number(conv)} className="w-12 h-1.5" />
                          <span className="text-xs">{conv}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Funnel */}
        <TabsContent value="funnel" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{language === "zh" ? "营销漏斗转化分析" : "Marketing Funnel Analysis"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {FUNNEL_STAGES.map((stage, i) => {
                const widthPct = stage.count / FUNNEL_STAGES[0].count * 100;
                const nextStage = FUNNEL_STAGES[i + 1];
                return (
                  <div key={stage.stage}>
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-sm font-medium text-right">{stage.stage}</span>
                      <div className="flex-1 relative">
                        <div className={`${stage.color} rounded h-10 flex items-center px-3 transition-all`} style={{ width: `${Math.max(widthPct, 8)}%` }}>
                          <span className="font-bold text-sm">{stage.count.toLocaleString()}</span>
                        </div>
                      </div>
                      {i > 0 && (
                        <Badge variant="outline" className="w-16 justify-center text-xs">
                          {stage.rate}%
                        </Badge>
                      )}
                    </div>
                    {nextStage && (
                      <div className="flex items-center gap-3 py-1">
                        <span className="w-24" />
                        <ArrowDown className="h-4 w-4 text-muted-foreground ml-4" />
                        <span className="text-xs text-muted-foreground">
                          {language === "zh" ? `转化 ${nextStage.rate}% (${stage.count - nextStage.count} 流失)` : `Conv ${nextStage.rate}% (${stage.count - nextStage.count} lost)`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="mt-4 p-3 bg-muted rounded-lg text-center">
                <p className="text-sm">{language === "zh" ? "整体转化率" : "Overall Conversion"}: <span className="font-bold text-green-600">访客→签约 0.096%</span> · {language === "zh" ? "线索→签约" : "Lead→Won"}: <span className="font-bold text-blue-600">5.2%</span></p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exhibitions */}
        <TabsContent value="exhibitions" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "zh" ? "展会名称" : "Exhibition"}</TableHead>
                  <TableHead>{language === "zh" ? "日期" : "Date"}</TableHead>
                  <TableHead>{language === "zh" ? "展位" : "Booth"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "访客" : "Visitors"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "线索" : "Leads"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "热线索" : "Hot"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "投入" : "Spend"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "产出" : "Revenue"}</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead>{language === "zh" ? "状态" : "Status"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EXHIBITIONS.map(ex => {
                  const roi = ex.spend > 0 ? ((ex.revenue - ex.spend) / ex.spend * 100).toFixed(0) : "-";
                  return (
                    <TableRow key={ex.name}>
                      <TableCell className="font-medium max-w-[200px]">{ex.name}</TableCell>
                      <TableCell className="text-sm">{ex.date}</TableCell>
                      <TableCell className="font-mono text-xs">{ex.booth}</TableCell>
                      <TableCell className="text-right">{ex.visitors || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{ex.leads || "-"}</TableCell>
                      <TableCell className="text-right text-red-600 font-bold">{ex.hotLeads || "-"}</TableCell>
                      <TableCell className="text-right">¥{(ex.spend / 10000).toFixed(1)}万</TableCell>
                      <TableCell className="text-right font-bold">{ex.revenue > 0 ? `¥${(ex.revenue / 10000).toFixed(0)}万` : "-"}</TableCell>
                      <TableCell className="text-right">
                        {roi !== "-" ? <Badge className={Number(roi) >= 500 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>{roi}%</Badge> : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={ex.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                          {ex.status === "completed" ? "已结束" : "即将举办"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Content Marketing */}
        <TabsContent value="content" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "zh" ? "内容类型" : "Content Type"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "浏览量" : "Views"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "下载量" : "Downloads"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "获取线索" : "Leads"}</TableHead>
                  <TableHead>{language === "zh" ? "转化率" : "Conv"}</TableHead>
                  <TableHead>{language === "zh" ? "最热内容" : "Top Content"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CONTENT_METRICS.map(cm => {
                  const conv = cm.views > 0 ? (cm.leads / cm.views * 100).toFixed(1) : 0;
                  return (
                    <TableRow key={cm.type}>
                      <TableCell className="font-medium">{cm.type}</TableCell>
                      <TableCell className="text-right">{cm.views.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{cm.downloads > 0 ? cm.downloads.toLocaleString() : "-"}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600">{cm.leads}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Progress value={Number(conv) * 10} className="w-10 h-1.5" />
                          <span className="text-xs">{conv}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{cm.topItem}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
