/**
 * 售后工程师工作台 (Service Engineer Workstation)
 *
 * 7-Tab聚合页面：
 * ① 我的客户   — 快速定位自己负责的客户 & 项目
 * ② 服务计划   — 待执行/进行中的PM & 巡检计划，填写完成报告
 * ③ 设备服务   — 选设备→查健康→做维修→看备件→写建议
 * ④ 维修记录   — 所有关联维修单一览
 * ⑤ 下次建议   — 系统+AI推荐的下一步操作
 * ⑥ 共享设置   — 默认共享人员 / 自动抄送 / 通知配置
 * ⑦ 自动汇报   — 按客户/服务类型自动生成汇报
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Users, ClipboardList, Wrench, History, Lightbulb,
  Share2, FileBarChart, ChevronRight, Play, CheckCircle2,
  AlertTriangle, Clock, Star, Phone, MapPin, Building2,
  Shield, Heart, Plus, Send, Trash2, Settings, Bell,
  Calendar, Search, RefreshCw,
} from "lucide-react";

export default function ServiceEngineerWorkstation() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [activeTab, setActiveTab] = useState("clients");

  // 概览统计
  const summaryQ = trpc.serviceEngineer.myProjects.summary.useQuery(undefined, { retry: false });
  const summary = summaryQ.data;

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* 顶部概览 */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {isZh ? "售后工程师工作台" : "Service Engineer Workstation"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isZh
              ? `${user?.name || "工程师"} — 客户服务 · 设备管理 · 自动汇报`
              : `${user?.name || "Engineer"} — Service · Equipment · Reporting`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <StatPill icon={<Users className="w-3.5 h-3.5" />} label={isZh ? "客户" : "Clients"} value={summary?.totalClients ?? "—"} />
          <StatPill icon={<ClipboardList className="w-3.5 h-3.5" />} label={isZh ? "待处理" : "Open"} value={summary?.openTickets ?? "—"} color="orange" />
          <StatPill icon={<CheckCircle2 className="w-3.5 h-3.5" />} label={isZh ? "本月完成" : "Done"} value={summary?.completedThisMonth ?? "—"} color="green" />
          <StatPill icon={<Star className="w-3.5 h-3.5" />} label={isZh ? "评分" : "Rating"} value={summary?.avgRating ?? "—"} color="amber" />
          <StatPill icon={<Calendar className="w-3.5 h-3.5" />} label={isZh ? "即将保养" : "PM Due"} value={summary?.upcomingPm ?? "—"} color="blue" />
        </div>
      </header>

      {/* 主体 Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="clients" className="gap-1.5"><Users className="w-4 h-4" />{isZh ? "我的客户" : "My Clients"}</TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5"><ClipboardList className="w-4 h-4" />{isZh ? "服务计划" : "Plans"}</TabsTrigger>
          <TabsTrigger value="equipment" className="gap-1.5"><Wrench className="w-4 h-4" />{isZh ? "设备服务" : "Equipment"}</TabsTrigger>
          <TabsTrigger value="repairs" className="gap-1.5"><History className="w-4 h-4" />{isZh ? "维修记录" : "Repairs"}</TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-1.5"><Lightbulb className="w-4 h-4" />{isZh ? "下次建议" : "Next Steps"}</TabsTrigger>
          <TabsTrigger value="sharing" className="gap-1.5"><Share2 className="w-4 h-4" />{isZh ? "共享设置" : "Sharing"}</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5"><FileBarChart className="w-4 h-4" />{isZh ? "自动汇报" : "Reports"}</TabsTrigger>
        </TabsList>

        {/* ① 我的客户 */}
        <TabsContent value="clients"><MyClientsTab /></TabsContent>

        {/* ② 服务计划 */}
        <TabsContent value="plans"><ServicePlansTab /></TabsContent>

        {/* ③ 设备服务 */}
        <TabsContent value="equipment"><EquipmentServiceTab /></TabsContent>

        {/* ④ 维修记录 */}
        <TabsContent value="repairs"><RepairHistoryTab /></TabsContent>

        {/* ⑤ 下次建议 */}
        <TabsContent value="recommendations"><RecommendationsTab /></TabsContent>

        {/* ⑥ 共享设置 */}
        <TabsContent value="sharing"><SharingSettingsTab /></TabsContent>

        {/* ⑦ 自动汇报 */}
        <TabsContent value="reports"><AutoReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════
// Tab ①: 我的客户
// ═══════════════════════════════════════
function MyClientsTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const clientsQ = trpc.serviceEngineer.myProjects.list.useQuery({});
  const clients = (clientsQ.data as any[]) || [];
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const equipmentQ = trpc.serviceEngineer.myProjects.equipmentsByClient.useQuery(
    { clientId: selectedClientId! },
    { enabled: !!selectedClientId },
  );
  const equipments = (equipmentQ.data as any[]) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
      {/* 左：客户列表 */}
      <div className="lg:col-span-1 space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">
          {isZh ? `我的客户 (${clients.length})` : `My Clients (${clients.length})`}
        </h3>
        {clients.length === 0 && !clientsQ.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{isZh ? "暂无关联客户" : "No assigned clients"}</p>
        )}
        {clients.map((c: any) => (
          <button
            key={c.clientId}
            onClick={() => setSelectedClientId(c.clientId)}
            className={`w-full text-left p-3 rounded-lg border transition-colors touch-feedback ${
              selectedClientId === c.clientId ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-semibold truncate">{c.clientName}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  {c.region && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{c.region}</span>}
                  {c.industry && <span>{c.industry}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <Badge variant={c.tier === "Strategic" ? "default" : c.tier === "Key" ? "secondary" : "outline"} className="text-[10px]">
                  {c.tier || "Standard"}
                </Badge>
                {(c.openLogs ?? 0) > 0 && (
                  <Badge variant="destructive" className="text-[10px]">{c.openLogs} {isZh ? "待处理" : "open"}</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-2">
              <span>{isZh ? "总工单" : "Total"}: {c.totalLogs}</span>
              {c.contactPerson && <span><Phone className="w-2.5 h-2.5 inline" /> {c.contactPerson}</span>}
              {c.slaLevel && <span><Shield className="w-2.5 h-2.5 inline" /> SLA-{c.slaLevel}</span>}
            </div>
          </button>
        ))}
      </div>

      {/* 右：选中客户的设备列表 */}
      <div className="lg:col-span-2">
        {selectedClientId ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {isZh ? "客户设备" : "Client Equipment"} ({equipments.length})
            </h3>
            {equipments.length === 0 && !equipmentQ.isLoading && (
              <p className="text-sm text-muted-foreground py-8 text-center">{isZh ? "该客户暂无已登记设备" : "No equipment registered"}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {equipments.map((eq: any) => {
                const health = Number(eq.healthScore) || 0;
                const healthColor = health >= 90 ? "text-green-600" : health >= 70 ? "text-amber-600" : "text-red-600";
                return (
                  <Card key={eq.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm">{eq.equipmentName || eq.equipmentModel}</p>
                          <p className="text-xs text-muted-foreground">{eq.equipmentCode} · SN: {eq.serialNumber || "—"}</p>
                        </div>
                        <Badge variant={eq.status === "running" ? "default" : eq.status === "fault" ? "destructive" : "secondary"} className="text-[10px]">
                          {eq.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                        <div>
                          <span className="text-muted-foreground">{isZh ? "健康" : "Health"}</span>
                          <p className={`font-bold ${healthColor}`}>{health}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{isZh ? "运行" : "Hours"}</span>
                          <p className="font-mono font-semibold">{Number(eq.totalRunningHours || 0).toLocaleString()}h</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{isZh ? "下次保养" : "Next PM"}</span>
                          <p className="font-semibold">{eq.nextPmDate ? new Date(eq.nextPmDate).toLocaleDateString() : "—"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>{isZh ? "← 选择一个客户查看设备" : "← Select a client to view equipment"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Tab ②: 服务计划
// ═══════════════════════════════════════
function ServicePlansTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [issuesFound, setIssuesFound] = useState("");
  const [nextRecommendation, setNextRecommendation] = useState("");
  const [nextDate, setNextDate] = useState("");

  const plansQ = trpc.serviceEngineer.planExecution.listMine.useQuery(
    { status: statusFilter || undefined },
    { retry: false },
  );
  const plans = (plansQ.data as any[]) || [];
  const utils = trpc.useUtils();

  const startMut = trpc.serviceEngineer.planExecution.start.useMutation({
    onSuccess: () => { toast({ title: isZh ? "已开始执行" : "Started" }); utils.serviceEngineer.planExecution.listMine.invalidate(); },
  });
  const completeMut = trpc.serviceEngineer.planExecution.complete.useMutation({
    onSuccess: () => {
      toast({ title: isZh ? "已完成" : "Completed" });
      setEditingId(null);
      setCompletionNotes("");
      setIssuesFound("");
      setNextRecommendation("");
      setNextDate("");
      utils.serviceEngineer.planExecution.listMine.invalidate();
    },
  });

  const statusColors: Record<string, string> = {
    planned: "bg-blue-100 text-blue-800",
    in_progress: "bg-amber-100 text-amber-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="mt-4 space-y-4">
      {/* 筛选 */}
      <div className="flex gap-2 flex-wrap">
        {["", "planned", "in_progress", "completed"].map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
            {s === "" ? (isZh ? "全部" : "All") : s === "planned" ? (isZh ? "待执行" : "Planned") : s === "in_progress" ? (isZh ? "进行中" : "In Progress") : (isZh ? "已完成" : "Done")}
          </Button>
        ))}
      </div>

      {/* 计划列表 */}
      {plans.length === 0 && !plansQ.isLoading && (
        <p className="text-center text-muted-foreground py-10">{isZh ? "暂无服务计划" : "No service plans"}</p>
      )}

      <div className="space-y-3">
        {plans.map((plan: any) => (
          <Card key={plan.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] ${statusColors[plan.status] || ""}`}>{plan.status}</Badge>
                  <span className="font-semibold text-sm">{plan.serviceType === "pm" ? "保养" : plan.serviceType === "repair" ? "维修" : plan.serviceType === "inspection" ? "巡检" : plan.serviceType}</span>
                </div>
                <div className="flex gap-2">
                  {plan.status === "planned" && (
                    <Button size="sm" variant="outline" onClick={() => startMut.mutate({ id: plan.id })} disabled={startMut.isPending}>
                      <Play className="w-3.5 h-3.5 mr-1" />{isZh ? "开始" : "Start"}
                    </Button>
                  )}
                  {plan.status === "in_progress" && (
                    <Button size="sm" onClick={() => setEditingId(editingId === plan.id ? null : plan.id)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />{isZh ? "填写完成" : "Complete"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                <span><Calendar className="w-3 h-3 inline mr-1" />{isZh ? "计划" : "Planned"}: {plan.plannedDate ? new Date(plan.plannedDate).toLocaleDateString() : "—"}</span>
                {plan.actualStartAt && <span><Play className="w-3 h-3 inline mr-1" />{isZh ? "开始" : "Started"}: {new Date(plan.actualStartAt).toLocaleDateString()}</span>}
                {plan.actualEndAt && <span><CheckCircle2 className="w-3 h-3 inline mr-1" />{isZh ? "完成" : "Done"}: {new Date(plan.actualEndAt).toLocaleDateString()}</span>}
              </div>

              {/* 完成填写表单 */}
              {editingId === plan.id && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <div>
                    <label className="text-xs font-medium">{isZh ? "完成报告" : "Completion Notes"}</label>
                    <Textarea value={completionNotes} onChange={(e) => setCompletionNotes(e.target.value)} placeholder={isZh ? "描述本次服务执行情况..." : "Describe service execution..."} rows={3} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">{isZh ? "发现问题" : "Issues Found"}</label>
                    <Textarea value={issuesFound} onChange={(e) => setIssuesFound(e.target.value)} placeholder={isZh ? "列出发现的问题（如无则留空）" : "List issues found (leave empty if none)"} rows={2} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">{isZh ? "下次服务建议" : "Next Service Recommendation"}</label>
                      <Textarea value={nextRecommendation} onChange={(e) => setNextRecommendation(e.target.value)} placeholder={isZh ? "建议下次服务内容..." : "Recommended next service..."} rows={2} />
                    </div>
                    <div>
                      <label className="text-xs font-medium">{isZh ? "建议下次日期" : "Suggested Date"}</label>
                      <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => completeMut.mutate({
                        id: plan.id,
                        completionNotes,
                        issuesFound: issuesFound || undefined,
                        nextServiceRecommendation: nextRecommendation || undefined,
                        nextRecommendedDate: nextDate || undefined,
                      })}
                      disabled={completeMut.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />{isZh ? "确认完成" : "Confirm Complete"}
                    </Button>
                    <Button variant="ghost" onClick={() => setEditingId(null)}>{isZh ? "取消" : "Cancel"}</Button>
                  </div>
                </div>
              )}

              {/* 已有建议显示 */}
              {plan.nextServiceRecommendation && (
                <div className="mt-3 p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs">
                  <Lightbulb className="w-3.5 h-3.5 inline text-amber-600 mr-1" />
                  <strong>{isZh ? "下次建议：" : "Next: "}</strong>{plan.nextServiceRecommendation}
                  {plan.nextRecommendedDate && <span className="ml-2 text-muted-foreground">({new Date(plan.nextRecommendedDate).toLocaleDateString()})</span>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Tab ③: 设备服务
// ═══════════════════════════════════════
function EquipmentServiceTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [equipmentId, setEquipmentId] = useState<number | null>(null);

  const healthQ = trpc.serviceEngineer.equipmentService.healthAndRecommendation.useQuery(
    { equipmentId: equipmentId! },
    { enabled: !!equipmentId, retry: false },
  );
  const data = healthQ.data;
  const sparePartsQ = trpc.serviceEngineer.equipmentService.spareParts.useQuery(
    { equipmentId: equipmentId! },
    { enabled: !!equipmentId, retry: false },
  );
  const spareParts = (sparePartsQ.data as any[]) || [];

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">{isZh ? "设备ID" : "Equipment ID"}:</label>
        <Input
          type="number"
          className="w-32"
          placeholder="ID"
          onChange={(e) => setEquipmentId(e.target.value ? Number(e.target.value) : null)}
        />
        <span className="text-xs text-muted-foreground">{isZh ? "输入设备ID查看详情 (从客户Tab获取)" : "Enter equipment ID from Client tab"}</span>
      </div>

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 设备健康 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                {isZh ? "设备健康" : "Equipment Health"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className={`text-4xl font-bold ${data.healthScore >= 90 ? "text-green-600" : data.healthScore >= 70 ? "text-amber-600" : "text-red-600"}`}>
                  {data.healthScore}%
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>{data.equipment.equipmentName}</p>
                  <p>{data.equipment.equipmentCode}</p>
                  <p>{isZh ? "运行" : "Hours"}: {Number(data.equipment.totalRunningHours || 0).toLocaleString()}h</p>
                </div>
              </div>

              {/* 即将到期保养 */}
              {data.upcomingPm.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold">{isZh ? "待保养计划" : "Upcoming PM"}</h4>
                  {data.upcomingPm.map((pm: any) => (
                    <div key={pm.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                      <span>{pm.planName || pm.planType}</span>
                      <Badge variant={pm.status === "overdue" ? "destructive" : "outline"} className="text-[10px]">
                        {pm.status === "overdue" ? (isZh ? "已过期" : "Overdue") : new Date(pm.scheduledDate).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 推荐操作 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                {isZh ? "系统建议" : "Recommendations"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.recommendations.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">{isZh ? "设备状态良好，暂无建议" : "Equipment healthy, no actions needed"}</p>
              )}
              {data.recommendations.map((rec: any, i: number) => (
                <div key={i} className={`p-3 rounded border text-sm ${rec.priority === "high" ? "border-red-200 bg-red-50 dark:bg-red-950/20" : "border-amber-200 bg-amber-50 dark:bg-amber-950/20"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={rec.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">{rec.priority}</Badge>
                    <span className="text-xs text-muted-foreground">{rec.type}</span>
                  </div>
                  <p className="text-sm">{rec.message}</p>
                  {rec.suggestedDate && <p className="text-xs text-muted-foreground mt-1">{isZh ? "建议日期" : "Suggested"}: {rec.suggestedDate}</p>}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 备件库存 */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{isZh ? "备件库存" : "Spare Parts"} ({spareParts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {spareParts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{isZh ? "无备件记录" : "No spare parts"}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 px-1">{isZh ? "备件" : "Part"}</th>
                        <th className="text-left py-2 px-1">{isZh ? "类别" : "Category"}</th>
                        <th className="text-right py-2 px-1">{isZh ? "库存" : "Stock"}</th>
                        <th className="text-right py-2 px-1">{isZh ? "最低" : "Min"}</th>
                        <th className="text-right py-2 px-1">{isZh ? "寿命(h)" : "Life(h)"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spareParts.map((sp: any) => (
                        <tr key={sp.id} className="border-b">
                          <td className="py-2 px-1 font-medium">{sp.partName}</td>
                          <td className="py-2 px-1">{sp.category}</td>
                          <td className={`py-2 px-1 text-right font-mono ${Number(sp.currentStock) <= Number(sp.minStockLevel) ? "text-red-600 font-bold" : ""}`}>
                            {sp.currentStock}
                          </td>
                          <td className="py-2 px-1 text-right text-muted-foreground">{sp.minStockLevel}</td>
                          <td className="py-2 px-1 text-right text-muted-foreground">{sp.lifeExpectancyHours || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// Tab ④: 维修记录
// ═══════════════════════════════════════
function RepairHistoryTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [equipmentId, setEquipmentId] = useState<number | null>(null);

  const repairsQ = trpc.serviceEngineer.equipmentService.repairHistory.useQuery(
    { equipmentId: equipmentId!, limit: 30 },
    { enabled: !!equipmentId, retry: false },
  );
  const repairs = (repairsQ.data as any[]) || [];

  const severityColors: Record<string, string> = {
    critical: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-green-100 text-green-800",
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">{isZh ? "设备ID" : "Equipment ID"}:</label>
        <Input type="number" className="w-32" placeholder="ID" onChange={(e) => setEquipmentId(e.target.value ? Number(e.target.value) : null)} />
      </div>

      {repairs.length === 0 && equipmentId && !repairsQ.isLoading && (
        <p className="text-center text-muted-foreground py-10">{isZh ? "无维修记录" : "No repair records"}</p>
      )}

      <div className="space-y-3">
        {repairs.map((r: any) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{r.repairCode}</span>
                  <Badge className={`text-[10px] ${severityColors[r.severity] || ""}`}>{r.severity}</Badge>
                  <Badge variant="outline" className="text-[10px]">{r.faultCategory}</Badge>
                </div>
                <Badge variant={r.status === "completed" ? "default" : r.status === "verified" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge>
              </div>
              <p className="text-sm">{r.faultDescription}</p>
              {r.solution && <p className="text-xs text-green-700 mt-1"><CheckCircle2 className="w-3 h-3 inline mr-0.5" />{r.solution}</p>}
              <div className="flex gap-4 text-[10px] text-muted-foreground mt-2">
                <span>{isZh ? "上报" : "Reported"}: {r.reportedAt ? new Date(r.reportedAt).toLocaleDateString() : "—"}</span>
                {r.executor && <span>{isZh ? "执行" : "By"}: {r.executor} ({r.executorType})</span>}
                {r.downtimeHours && <span>{isZh ? "停机" : "Downtime"}: {r.downtimeHours}h</span>}
              </div>
              {r.preventiveMeasure && (
                <div className="mt-2 p-2 rounded bg-blue-50 dark:bg-blue-950/20 text-xs">
                  <Shield className="w-3 h-3 inline text-blue-600 mr-1" />
                  {isZh ? "预防措施：" : "Prevention: "}{r.preventiveMeasure}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Tab ⑤: 下次建议（聚合所有设备推荐）
// ═══════════════════════════════════════
function RecommendationsTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  // 获取工程师所有待执行计划中有建议的
  const plansQ = trpc.serviceEngineer.planExecution.listMine.useQuery({ status: "completed" }, { retry: false });
  const plans = (plansQ.data as any[]) || [];
  const withRecs = plans.filter((p: any) => p.nextServiceRecommendation);

  return (
    <div className="mt-4 space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">
        {isZh ? "基于历史服务的下次建议" : "Recommendations from past services"}
      </h3>

      {withRecs.length === 0 && !plansQ.isLoading && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 text-amber-300" />
            <p>{isZh ? "完成服务计划后系统会生成下次建议" : "Complete service plans to see recommendations"}</p>
          </CardContent>
        </Card>
      )}

      {withRecs.map((plan: any) => (
        <Card key={plan.id} className="border-l-4 border-l-amber-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-[10px]">{isZh ? "设备" : "Equipment"} #{plan.equipmentId}</Badge>
              {plan.nextRecommendedDate && (
                <span className="text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3 inline mr-0.5" />
                  {new Date(plan.nextRecommendedDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-sm">{plan.nextServiceRecommendation}</p>
            {plan.issuesFound && (
              <p className="text-xs text-red-600 mt-1">
                <AlertTriangle className="w-3 h-3 inline mr-0.5" />
                {isZh ? "遗留问题：" : "Issues: "}{plan.issuesFound}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════
// Tab ⑥: 共享设置
// ═══════════════════════════════════════
function SharingSettingsTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";

  const defaultsQ = trpc.serviceEngineer.shareSettings.getDefaults.useQuery(undefined, { retry: false });
  const defaults = (defaultsQ.data as any[]) || [];
  const allQ = trpc.serviceEngineer.shareSettings.list.useQuery({}, { retry: false });
  const all = (allQ.data as any[]) || [];
  const utils = trpc.useUtils();

  const [newUserId, setNewUserId] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newType, setNewType] = useState("default_cc");
  const [newChannel, setNewChannel] = useState("system");

  const addMut = trpc.serviceEngineer.shareSettings.add.useMutation({
    onSuccess: () => {
      toast({ title: isZh ? "已添加" : "Added" });
      setNewUserId(""); setNewName(""); setNewRole("");
      utils.serviceEngineer.shareSettings.invalidate();
    },
  });
  const removeMut = trpc.serviceEngineer.shareSettings.remove.useMutation({
    onSuccess: () => { toast({ title: isZh ? "已移除" : "Removed" }); utils.serviceEngineer.shareSettings.invalidate(); },
  });

  const typeLabels: Record<string, string> = {
    default_cc: isZh ? "默认抄送" : "Default CC",
    auto_notify: isZh ? "自动通知" : "Auto Notify",
    report_recipient: isZh ? "汇报接收" : "Report Recipient",
  };

  return (
    <div className="mt-4 space-y-6">
      {/* 全局默认共享 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {isZh ? "全局默认共享人员" : "Default Shared Personnel"}
          </CardTitle>
          <CardDescription>{isZh ? "所有服务工单自动抄送/通知以下人员" : "Auto-CC for all service tickets"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {defaults.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between p-2 rounded border">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{typeLabels[d.shareType] || d.shareType}</Badge>
                <span className="text-sm font-medium">{d.sharedWithName || `User #${d.sharedWithUserId}`}</span>
                {d.sharedWithRole && <span className="text-xs text-muted-foreground">({d.sharedWithRole})</span>}
                <Badge variant="secondary" className="text-[10px]"><Bell className="w-2.5 h-2.5 mr-0.5" />{d.notifyChannel}</Badge>
              </div>
              <Button size="sm" variant="ghost" onClick={() => removeMut.mutate({ id: d.id })}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
            </div>
          ))}

          <Separator />

          {/* 添加新共享人员 */}
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-[10px] text-muted-foreground">{isZh ? "员工ID" : "User ID"}</label>
              <Input type="number" className="w-24 h-8 text-sm" value={newUserId} onChange={(e) => setNewUserId(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">{isZh ? "姓名" : "Name"}</label>
              <Input className="w-28 h-8 text-sm" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">{isZh ? "角色" : "Role"}</label>
              <Input className="w-28 h-8 text-sm" value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder={isZh ? "如: 项目经理" : "e.g. PM"} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">{isZh ? "类型" : "Type"}</label>
              <select className="h-8 text-sm border rounded px-2" value={newType} onChange={(e) => setNewType(e.target.value)}>
                <option value="default_cc">{isZh ? "默认抄送" : "Default CC"}</option>
                <option value="auto_notify">{isZh ? "自动通知" : "Auto Notify"}</option>
                <option value="report_recipient">{isZh ? "汇报接收" : "Report"}</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">{isZh ? "渠道" : "Channel"}</label>
              <select className="h-8 text-sm border rounded px-2" value={newChannel} onChange={(e) => setNewChannel(e.target.value)}>
                <option value="system">{isZh ? "系统" : "System"}</option>
                <option value="email">Email</option>
                <option value="wechat">{isZh ? "微信" : "WeChat"}</option>
                <option value="all">{isZh ? "全部" : "All"}</option>
              </select>
            </div>
            <Button size="sm" onClick={() => newUserId && addMut.mutate({ sharedWithUserId: Number(newUserId), sharedWithName: newName || undefined, sharedWithRole: newRole || undefined, shareType: newType, notifyChannel: newChannel })} disabled={!newUserId || addMut.isPending}>
              <Plus className="w-3.5 h-3.5 mr-1" />{isZh ? "添加" : "Add"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 所有共享记录 */}
      {all.length > defaults.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isZh ? "客户/设备级共享" : "Client/Equipment Sharing"} ({all.length - defaults.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {all.filter((a: any) => a.customerId || a.equipmentId).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-2 rounded border mb-2">
                <div className="flex items-center gap-2 text-sm">
                  {d.customerId && <Badge variant="outline" className="text-[10px]">{isZh ? "客户" : "Client"} #{d.customerId}</Badge>}
                  {d.equipmentId && <Badge variant="outline" className="text-[10px]">{isZh ? "设备" : "Equip"} #{d.equipmentId}</Badge>}
                  <span className="font-medium">{d.sharedWithName || `#${d.sharedWithUserId}`}</span>
                  <Badge variant="secondary" className="text-[10px]">{typeLabels[d.shareType] || d.shareType}</Badge>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeMut.mutate({ id: d.id })}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// Tab ⑦: 自动汇报
// ═══════════════════════════════════════
function AutoReportsTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";

  const reportsQ = trpc.serviceEngineer.autoReport.list.useQuery(undefined, { retry: false });
  const reports = (reportsQ.data as any[]) || [];
  const utils = trpc.useUtils();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroupBy, setNewGroupBy] = useState("by_customer");
  const [newFreq, setNewFreq] = useState("weekly");
  const [newTemplate, setNewTemplate] = useState("summary");

  const createMut = trpc.serviceEngineer.autoReport.create.useMutation({
    onSuccess: () => {
      toast({ title: isZh ? "已创建" : "Created" });
      setShowCreate(false);
      setNewName("");
      utils.serviceEngineer.autoReport.invalidate();
    },
  });
  const deleteMut = trpc.serviceEngineer.autoReport.delete.useMutation({
    onSuccess: () => { toast({ title: isZh ? "已删除" : "Deleted" }); utils.serviceEngineer.autoReport.invalidate(); },
  });
  const toggleMut = trpc.serviceEngineer.autoReport.update.useMutation({
    onSuccess: () => utils.serviceEngineer.autoReport.invalidate(),
  });

  const groupLabels: Record<string, string> = {
    by_customer: isZh ? "按客户" : "By Client",
    by_service_type: isZh ? "按服务类型" : "By Type",
    by_equipment_model: isZh ? "按设备型号" : "By Model",
    by_region: isZh ? "按区域" : "By Region",
  };
  const freqLabels: Record<string, string> = {
    daily: isZh ? "每日" : "Daily",
    weekly: isZh ? "每周" : "Weekly",
    monthly: isZh ? "每月" : "Monthly",
    on_completion: isZh ? "完成时" : "On Done",
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">{isZh ? "汇报配置" : "Report Configs"} ({reports.length})</h3>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-3.5 h-3.5 mr-1" />{isZh ? "新建汇报" : "New Report"}
        </Button>
      </div>

      {/* 创建表单 */}
      {showCreate && (
        <Card className="border-primary/50">
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="text-xs font-medium">{isZh ? "汇报名称" : "Report Name"}</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={isZh ? "如: 每周客户服务汇总" : "e.g. Weekly client service summary"} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium">{isZh ? "分组维度" : "Group By"}</label>
                <select className="w-full h-9 text-sm border rounded px-2" value={newGroupBy} onChange={(e) => setNewGroupBy(e.target.value)}>
                  {Object.entries(groupLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">{isZh ? "频率" : "Frequency"}</label>
                <select className="w-full h-9 text-sm border rounded px-2" value={newFreq} onChange={(e) => setNewFreq(e.target.value)}>
                  {Object.entries(freqLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">{isZh ? "模板" : "Template"}</label>
                <select className="w-full h-9 text-sm border rounded px-2" value={newTemplate} onChange={(e) => setNewTemplate(e.target.value)}>
                  <option value="summary">{isZh ? "摘要" : "Summary"}</option>
                  <option value="detailed">{isZh ? "详细" : "Detailed"}</option>
                  <option value="kpi">{isZh ? "仅KPI" : "KPI Only"}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => newName && createMut.mutate({ reportName: newName, groupBy: newGroupBy, frequency: newFreq, templateType: newTemplate })} disabled={!newName || createMut.isPending}>
                <Send className="w-3.5 h-3.5 mr-1" />{isZh ? "创建" : "Create"}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>{isZh ? "取消" : "Cancel"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 汇报列表 */}
      {reports.length === 0 && !reportsQ.isLoading && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileBarChart className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>{isZh ? "暂无自动汇报配置" : "No auto-reports configured"}</p>
          </CardContent>
        </Card>
      )}

      {reports.map((r: any) => (
        <Card key={r.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{r.reportName}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">{groupLabels[r.groupBy] || r.groupBy}</Badge>
                  <Badge variant="outline" className="text-[10px]">{freqLabels[r.frequency] || r.frequency}</Badge>
                  <Badge variant="outline" className="text-[10px]">{r.templateType}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={r.isActive ? "default" : "outline"}
                  onClick={() => toggleMut.mutate({ id: r.id, isActive: !r.isActive })}
                >
                  {r.isActive ? (isZh ? "启用中" : "Active") : (isZh ? "已停用" : "Paused")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteMut.mutate({ id: r.id })}>
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </Button>
              </div>
            </div>
            {r.lastSentAt && (
              <p className="text-[10px] text-muted-foreground mt-2">
                {isZh ? "上次发送" : "Last sent"}: {new Date(r.lastSentAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════
// 通用组件
// ═══════════════════════════════════════
function StatPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  const colorMap: Record<string, string> = {
    orange: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30",
    green: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30",
    amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30",
    blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30",
  };
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${color ? colorMap[color] || "" : "border-border"}`}>
      {icon}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}
