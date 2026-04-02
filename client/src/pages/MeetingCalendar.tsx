/**
 * MeetingCalendar — 会议日历
 * 全公司会议总览、创建、管理
 */
import { useState, Fragment, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Clock, Users, ChevronDown, ChevronUp } from "lucide-react";

// ── Helpers ──
function getCat(title: string) {
  if (title.includes("走线")) return "走线";
  if (title.includes("晨会")) return "晨会";
  if (title.includes("销售")) return "销售";
  if (title.includes("月度")) return "月度";
  if (title.includes("客户")) return "客户";
  if (title.includes("评审")) return "评审";
  return "其他";
}
const CAT_CLS: Record<string, string> = {
  走线: "bg-red-100 text-red-700", 晨会: "bg-orange-100 text-orange-700",
  销售: "bg-cyan-100 text-cyan-700", 月度: "bg-purple-100 text-purple-700",
  客户: "bg-green-100 text-green-700", 评审: "bg-blue-100 text-blue-700",
  其他: "bg-gray-100 text-gray-700",
};
const FILTER_KEYS = ["全部", "走线", "晨会", "销售", "月度", "客户", "评审"];
const ROOMS = ["一楼大厅", "车间现场", "一楼会议室A", "二楼会议室B", "三楼培训室", "Teams线上", "客户现场"];

const TEMPLATES: Record<string, { prefix: string; desc: string; min: number; attendees: string; room: string; direction: string; category: string }> = {
  走线会: {
    prefix: "部门长走线会 — ",
    desc: "议程: OPL回顾(15min) → 现场巡检(25min) → 发现项登记(10min) → 红黑榜更新(5min) → 改善案例分享(5min)",
    min: 60, room: "一楼大厅", direction: "INTERNAL", category: "GATE_REVIEW",
    attendees: "倪亚东(董事长), 刘奥运(CTO/董事长助理), 倪微薇(AI数智部经理), 金晓锋(质量经理), 徐树奎(事业二部经理), 周辉(事业三部经理), 洪香龙(机械设计经理), 杨勇(生产工程师/PM), 马柯(质量专员)",
  },
  晨会: {
    prefix: "事业部晨会 — ",
    desc: "议程: 上周产值(5min) → 项目交付(5min) → 质量指标(5min) → 销售动态(5min) → 本周重点(5min) → 表扬(5min)",
    min: 30, room: "车间现场", direction: "INTERNAL", category: "TEAM_SYNC",
    attendees: "事业部经理, 杨勇(PM), 马林山(装配班组长)/吕雪冬(电气班组长), 金晓锋(质量), 对应销售工程师",
  },
  "BU1晨会": {
    prefix: "海外事业部晨会 — ",
    desc: "议程: 上周产值(5min) → 项目交付(5min) → 质量指标(5min) → 销售动态(5min) → 本周重点(5min) → 表扬(5min)",
    min: 30, room: "车间现场", direction: "INTERNAL", category: "TEAM_SYNC",
    attendees: "戴晓燕(高级销售经理), 金晓锋(质量经理), 匡凯旋(售后主管), 杜显文(电气副班长), 吕雪冬(电气班组长), 王志强(销售), 刘健康(销售), 董纾雨(销售)",
  },
  "BU2晨会": {
    prefix: "商用车事业部晨会 — ",
    desc: "议程: 上周产值(5min) → 项目交付(5min) → 质量指标(5min) → 销售动态(5min) → 本周重点(5min) → 表扬(5min)",
    min: 30, room: "车间现场", direction: "INTERNAL", category: "TEAM_SYNC",
    attendees: "徐树奎(事业二部经理), 洪香龙(机械设计经理), 钱佳奇(电气), 马林山(装配班组长), 蔡瑞(机械研发), 殷金刚(机械研发)",
  },
  "BU3晨会": {
    prefix: "乘用车事业部晨会 — ",
    desc: "议程: 上周产值(5min) → 项目交付(5min) → 质量指标(5min) → 销售动态(5min) → 本周重点(5min) → 表扬(5min)",
    min: 30, room: "车间现场", direction: "INTERNAL", category: "TEAM_SYNC",
    attendees: "周辉(事业三部经理), 孙坚(电气主管), 沈迎凤(采购经理), 冯燕(销售), 韩保程(销售), 李柯瑶(销售), 杨勇(PM), 罗小玲(助理机械研发)",
  },
  销售周例会: {
    prefix: "销售周例会 — ",
    desc: "议程: 行动项回顾(10min) → 客户拜访(15min) → 漏斗更新(10min) → 订单报价(10min) → 下周计划(10min)",
    min: 60, room: "一楼会议室A", direction: "INTERNAL", category: "TEAM_SYNC",
    attendees: "戴晓燕(高级销售经理), 王志强(BU1销售), 刘健康(BU1销售), 董纾雨(BU1销售), 冯燕(BU3销售), 韩保程(BU3销售), 李柯瑶(BU3销售), 刘坤(市场主管), 朱文韬(市场专员)",
  },
  月度KPI会: {
    prefix: "月度KPI分析会 — ",
    desc: "议程: 业绩总览(10min) → 个人KPI(30min) → 重点项目(15min) → 丢单复盘(10min) → 下月目标(15min)",
    min: 90, room: "二楼会议室B", direction: "INTERNAL", category: "GATE_REVIEW",
    attendees: "倪亚东(董事长), 刘奥运(CTO), 戴晓燕(销售经理), 王志强(BU1), 刘健康(BU1), 董纾雨(BU1), 冯燕(BU3), 韩保程(BU3), 李柯瑶(BU3), 刘坤(市场)",
  },
  月度经营会: {
    prefix: "月度经营分析会 — ",
    desc: "议程: 财务总览(15min) → 各BU述职(30min) → 质量交付(15min) → 人力回顾(10min) → 下月目标(10min)",
    min: 120, room: "三楼培训室", direction: "INTERNAL", category: "GATE_REVIEW",
    attendees: "倪亚东(董事长), 刘奥运(CTO), 倪微薇(AI数智部经理), 倪微薇(HR), 王秀萍(财务), 戴晓燕(BU1销售经理), 徐树奎(BU2经理), 周辉(BU3经理), 金晓锋(质量), 沈迎凤(采购)",
  },
  季度战略会: {
    prefix: "季度战略回顾会 — ",
    desc: "议程: 季度业绩(20min) → 行业分析(15min) → 竞争格局(10min) → 客户评审(20min) → Q+1策略(20min)",
    min: 120, room: "三楼培训室", direction: "INTERNAL", category: "GATE_REVIEW",
    attendees: "倪亚东(董事长), 刘奥运(CTO), 倪微薇(AI数智部经理), 倪微薇(HR), 王秀萍(财务), 戴晓燕(BU1), 徐树奎(BU2), 周辉(BU3), 金晓锋(质量), 杨勇(PM), 洪香龙(设计), 全体销售工程师",
  },
  设计评审: {
    prefix: "设计评审会 — ",
    desc: "议程: 总体方案评审(20min) → 关键零部件选型(15min) → DFMEA(15min) → 风险评估(10min) → 结论(10min)",
    min: 70, room: "二楼会议室B", direction: "INTERNAL", category: "DESIGN_REVIEW",
    attendees: "刘奥运(CTO), 洪香龙(机械设计经理), 洪小东(机械研发), 蔡瑞(机械研发), 李大鹏(电气), 钱佳奇(电气), 金晓锋(质量), 对应项目PM",
  },
  客户来访: {
    prefix: "客户来访接待 — ",
    desc: "议程: 公司介绍(15min) → 技术方案演示(30min) → 工厂参观(40min) → 商务洽谈(30min) → 下一步(15min)",
    min: 130, room: "三楼培训室", direction: "EXTERNAL", category: "CUSTOMER_MEETING",
    attendees: "倪亚东(董事长), 刘奥运(CTO), 对应事业部经理, 对应销售工程师, 洪香龙(机械设计, 如需), 金晓锋(质量, 如需)",
  },
};

const EMPTY = { title: "", type: "MAJOR", meetingCategory: "TEAM_SYNC", direction: "INTERNAL", room: "", start: "", end: "", attendees: "", desc: "", teams: "", tpl: "" };

export default function MeetingCalendar() {
  const { toast } = useToast();
  const { t } = useLanguage();

  const FILTER_LABELS: Record<string, string> = useMemo(() => ({
    "全部": t("meeting.cal.filterAll"),
    "走线": t("meeting.cal.filterGemba"),
    "晨会": t("meeting.cal.filterStandup"),
    "销售": t("meeting.cal.filterSales"),
    "月度": t("meeting.cal.filterMonthly"),
    "客户": t("meeting.cal.filterCustomer"),
    "评审": t("meeting.cal.filterReview"),
  }), [t]);

  const q = trpc.smartMeeting.meeting.list.useQuery({ limit: 200 }, { retry: false });
  const meetings: any[] = Array.isArray(q.data) ? q.data : [];
  const createMut = trpc.smartMeeting.meeting.create.useMutation({
    onSuccess: () => { toast({ title: t("meeting.cal.createSuccess") }); setOpen(false); setF({ ...EMPTY }); q.refetch(); },
    onError: (e) => toast({ title: t("meeting.cal.createFailed"), description: e.message, variant: "destructive" }),
  });

  const syncAllMut = trpc.smartMeeting.meeting.syncAllToOutlook.useMutation();

  const [filter, setFilter] = useState("全部");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ ...EMPTY });
  const [expandId, setExpandId] = useState<number | null>(null);

  const filtered = filter === "全部" ? meetings : meetings.filter((m: any) => getCat(String(m.title || "")) === filter);
  const sorted = [...filtered].sort((a: any, b: any) => String(a.scheduledStart || "").localeCompare(String(b.scheduledStart || "")));

  // Stats
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const total = meetings.length;
  const thisMonth = meetings.filter((m: any) => String(m.scheduledStart || "").startsWith(month)).length;
  const upcoming = meetings.filter((m: any) => m.status === "UPCOMING").length;

  function applyTpl(key: string) {
    const tpl = TEMPLATES[key]; if (!tpl) return;
    setF(p => ({ ...p, tpl: key, title: tpl.prefix, desc: tpl.desc, attendees: tpl.attendees, room: tpl.room, direction: tpl.direction, meetingCategory: tpl.category }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) { toast({ title: t("meeting.cal.titleRequired"), variant: "destructive" }); return; }
    const descParts = [f.room ? `会议室: ${f.room}` : "", f.attendees ? `参会人: ${f.attendees}` : "", f.teams ? `Teams: ${f.teams}` : "", f.desc].filter(Boolean).join("\n\n");
    createMut.mutate({
      title: f.title.trim(),
      type: f.type as any,
      meetingCategory: f.meetingCategory as any,
      direction: f.direction as any,
      description: descParts || undefined,
      scheduledStart: f.start || undefined,
      scheduledEnd: f.end || undefined,
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-7 w-7 text-blue-600" />
          <div><h1 className="text-2xl font-bold">{t("meeting.cal.title")}</h1><p className="text-sm text-muted-foreground">{t("meeting.cal.subtitle")}</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            syncAllMut.mutate(undefined, {
              onSuccess: (d: any) => toast({ title: t("meeting.cal.syncSuccess"), description: `${d?.synced ?? 0} / ${d?.failed ?? 0}` }),
              onError: (e: any) => toast({ title: t("meeting.cal.syncFailed"), description: e.message, variant: "destructive" }),
            });
          }} disabled={syncAllMut.isPending}>
            {syncAllMut.isPending ? t("meeting.cal.syncing") : t("meeting.cal.syncOutlook")}
          </Button>
          <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />{t("meeting.cal.createMeeting")}</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="flex items-center gap-3 p-4"><Calendar className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{total}</p><p className="text-xs text-muted-foreground">{t("meeting.cal.totalMeetings")}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><Clock className="h-8 w-8 text-purple-500" /><div><p className="text-2xl font-bold">{thisMonth}</p><p className="text-xs text-muted-foreground">{t("meeting.cal.thisMonth")}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><Users className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{upcoming}</p><p className="text-xs text-muted-foreground">{t("meeting.cal.upcoming")}</p></div></CardContent></Card>
      </div>

      {/* Filters + List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("meeting.cal.meetingList")}</CardTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            {FILTER_KEYS.map(fi => (
              <Button key={fi} size="sm" variant={filter === fi ? "default" : "outline"} onClick={() => setFilter(fi)}>{FILTER_LABELS[fi] || fi}</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {q.isLoading ? <p className="py-8 text-center text-muted-foreground">{t("meeting.cal.loading")}</p> :
           sorted.length === 0 ? <p className="py-8 text-center text-muted-foreground">{t("meeting.cal.noMeetings")}</p> : (
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {sorted.map((m: any) => {
                const title = String(m.title || "");
                const cat = getCat(title);
                const dateStr = String(m.scheduledStart || "").slice(0, 10);
                const timeStr = String(m.scheduledStart || "").slice(11, 16);
                const endTime = String(m.scheduledEnd || "").slice(11, 16);
                const isExp = expandId === m.id;
                return (
                  <Fragment key={m.id}>
                    <div className="flex items-center gap-3 py-2 px-1 hover:bg-muted/30 cursor-pointer" onClick={() => setExpandId(isExp ? null : m.id)}>
                      <div className="w-24 shrink-0 text-xs font-mono text-muted-foreground">{dateStr}</div>
                      <div className="w-20 shrink-0 text-xs font-mono text-muted-foreground">{timeStr}{endTime ? `-${endTime}` : ""}</div>
                      <Badge variant="secondary" className={`shrink-0 ${CAT_CLS[cat] || CAT_CLS["其他"]}`}>{cat}</Badge>
                      <div className="flex-1 min-w-0 text-sm font-medium truncate">{title}</div>
                      <Badge variant="outline" className={m.status === "UPCOMING" ? "text-blue-600 border-blue-200" : m.status === "LIVE" ? "text-green-600 border-green-200" : "text-gray-500"}>{String(m.status || "")}</Badge>
                      {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    {isExp && (
                      <div className="px-4 py-3 bg-muted/20 text-sm">
                        <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{String(m.description || t("meeting.cal.noDescription"))}</pre>
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 周期性会议体系 */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("meeting.cal.recurringTable")}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs border">
            <thead><tr className="bg-muted/50">
              <th className="px-2 py-1.5 text-left border-b">{t("meeting.cal.colMeeting")}</th><th className="px-2 py-1.5 text-left border-b">{t("meeting.cal.colFrequency")}</th><th className="px-2 py-1.5 text-left border-b">{t("meeting.cal.colTime")}</th><th className="px-2 py-1.5 text-left border-b">{t("meeting.cal.colLocation")}</th><th className="px-2 py-1.5 text-left border-b">{t("meeting.cal.colAttendees")}</th><th className="px-2 py-1.5 text-left border-b">{t("meeting.cal.colAgenda")}</th>
            </tr></thead>
            <tbody>
              <tr className="bg-red-50/30"><td className="px-2 py-1.5 border-b font-medium">部门长走线会</td><td className="px-2 py-1.5 border-b">每周四</td><td className="px-2 py-1.5 border-b">9:00-10:00</td><td className="px-2 py-1.5 border-b">一楼大厅</td><td className="px-2 py-1.5 border-b">CEO+部门长+质量</td><td className="px-2 py-1.5 border-b">OPL→巡检→红黑榜</td></tr>
              <tr className="bg-orange-50/30"><td className="px-2 py-1.5 border-b font-medium">事业部晨会</td><td className="px-2 py-1.5 border-b">每周一</td><td className="px-2 py-1.5 border-b">7:50-8:20</td><td className="px-2 py-1.5 border-b">车间现场</td><td className="px-2 py-1.5 border-b">BU经理+PM+生产/质量/销售</td><td className="px-2 py-1.5 border-b">产值→交付→质量→销售→重点</td></tr>
              <tr className="bg-cyan-50/30"><td className="px-2 py-1.5 border-b font-medium">销售周例会</td><td className="px-2 py-1.5 border-b">每周一</td><td className="px-2 py-1.5 border-b">9:00-10:00</td><td className="px-2 py-1.5 border-b">会议室</td><td className="px-2 py-1.5 border-b">销售总监+王志强/冯燕/韩宝程</td><td className="px-2 py-1.5 border-b">拜访→漏斗→订单→计划</td></tr>
              <tr className="bg-purple-50/30"><td className="px-2 py-1.5 border-b font-medium">月度KPI会</td><td className="px-2 py-1.5 border-b">每月28日</td><td className="px-2 py-1.5 border-b">14:00-15:30</td><td className="px-2 py-1.5 border-b">会议室</td><td className="px-2 py-1.5 border-b">CEO/CTO+全体销售</td><td className="px-2 py-1.5 border-b">业绩→KPI→项目→复盘</td></tr>
              <tr className="bg-purple-50/30"><td className="px-2 py-1.5 border-b font-medium">月度经营会</td><td className="px-2 py-1.5 border-b">每月末</td><td className="px-2 py-1.5 border-b">14:00-16:00</td><td className="px-2 py-1.5 border-b">会议室</td><td className="px-2 py-1.5 border-b">CEO/CTO+BU经理+财务/HR</td><td className="px-2 py-1.5 border-b">营收→述职→质量→人力</td></tr>
              <tr className="bg-amber-50/30"><td className="px-2 py-1.5 font-medium">季度战略会</td><td className="px-2 py-1.5">每季末</td><td className="px-2 py-1.5">9:00-11:00</td><td className="px-2 py-1.5">会议室</td><td className="px-2 py-1.5">CEO/CTO+销售+财务</td><td className="px-2 py-1.5">回顾→分析→竞争→策略</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("meeting.cal.createMeeting")}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("meeting.cal.quickCreate")}</label>
              <Select value={f.tpl} onValueChange={applyTpl}>
                <SelectTrigger><SelectValue placeholder={t("meeting.cal.selectTemplate")} /></SelectTrigger>
                <SelectContent>
                  {Object.keys(TEMPLATES).map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("meeting.cal.meetingTitle")} *</label>
              <Input value={f.title} onChange={e => setF(p => ({ ...p, title: e.target.value }))} required placeholder={t("meeting.cal.titlePlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("meeting.cal.meetingType")}</label>
                <Select value={f.type} onValueChange={v => setF(p => ({ ...p, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MAJOR">{t("meeting.cal.typeMajor")}</SelectItem><SelectItem value="MINOR">{t("meeting.cal.typeMinor")}</SelectItem></SelectContent></Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("meeting.cal.category")}</label>
                <Select value={f.meetingCategory} onValueChange={v => setF(p => ({ ...p, meetingCategory: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TEAM_SYNC">{t("meeting.cal.catTeamSync")}</SelectItem><SelectItem value="GATE_REVIEW">{t("meeting.cal.catGateReview")}</SelectItem><SelectItem value="DESIGN_REVIEW">{t("meeting.cal.catDesignReview")}</SelectItem><SelectItem value="CUSTOMER_MEETING">{t("meeting.cal.catCustomer")}</SelectItem><SelectItem value="TRAINING">{t("meeting.cal.catTraining")}</SelectItem><SelectItem value="OTHER">{t("meeting.cal.catOther")}</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("meeting.cal.direction")}</label>
                <Select value={f.direction} onValueChange={v => setF(p => ({ ...p, direction: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INTERNAL">{t("meeting.cal.dirInternal")}</SelectItem><SelectItem value="EXTERNAL">{t("meeting.cal.dirExternal")}</SelectItem></SelectContent></Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("meeting.cal.room")}</label>
                <Select value={f.room} onValueChange={v => setF(p => ({ ...p, room: v }))}><SelectTrigger><SelectValue placeholder={t("meeting.cal.selectRoom")} /></SelectTrigger><SelectContent>{ROOMS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">{t("meeting.cal.startTime")}</label><Input type="datetime-local" value={f.start} onChange={e => setF(p => ({ ...p, start: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">{t("meeting.cal.endTime")}</label><Input type="datetime-local" value={f.end} onChange={e => setF(p => ({ ...p, end: e.target.value }))} /></div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("meeting.cal.attendees")}</label>
              <Input value={f.attendees} onChange={e => setF(p => ({ ...p, attendees: e.target.value }))} placeholder={t("meeting.cal.attendeesHint")} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("meeting.cal.teamsLink")}</label>
              <Input value={f.teams} onChange={e => setF(p => ({ ...p, teams: e.target.value }))} placeholder={t("meeting.cal.teamsPlaceholder")} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("meeting.cal.description")}</label>
              <Textarea value={f.desc} onChange={e => setF(p => ({ ...p, desc: e.target.value }))} rows={4} placeholder={t("meeting.cal.descPlaceholder")} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? t("meeting.cal.creating") : t("meeting.cal.createMeeting")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
