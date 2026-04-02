/**
 * 系统变更控制中心
 * 胡杨提交申请 → 倪微薇/倪亚东审批 → 批准后方可执行
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
import {
  Shield, Send, CheckCircle2, XCircle, Clock, AlertTriangle,
  FileText, Lock, Play, Ban, ChevronRight, ThumbsUp, ThumbsDown,
} from "lucide-react";

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  critical: { label: "L4 关键", color: "text-red-700", bgColor: "bg-red-100" },
  major: { label: "L3 重要", color: "text-orange-700", bgColor: "bg-orange-100" },
  standard: { label: "L2 标准", color: "text-blue-700", bgColor: "bg-blue-100" },
  minor: { label: "L1 轻微", color: "text-green-700", bgColor: "bg-green-100" },
};
const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: "待审批", icon: Clock, color: "text-amber-600" },
  approved: { label: "已批准", icon: CheckCircle2, color: "text-green-600" },
  rejected: { label: "已拒绝", icon: XCircle, color: "text-red-600" },
  executed: { label: "已执行", icon: Play, color: "text-blue-600" },
};

export default function ChangeControlCenter() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [tab, setTab] = useState("submit");

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6 text-amber-500" />{isZh ? "系统变更控制中心" : "Change Control Center"}</h1>
        <p className="text-sm text-muted-foreground">{isZh ? "提交申请 → 管理层审批 → 批准后执行 · 系统只执行已批准内容" : "Submit → Approve → Execute only approved changes"}</p>
      </header>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="submit" className="gap-1"><Send className="w-4 h-4" />{isZh ? "提交申请" : "Submit"}</TabsTrigger>
          <TabsTrigger value="approve" className="gap-1"><Shield className="w-4 h-4" />{isZh ? "审批" : "Approve"}</TabsTrigger>
          <TabsTrigger value="history" className="gap-1"><FileText className="w-4 h-4" />{isZh ? "历史记录" : "History"}</TabsTrigger>
          <TabsTrigger value="rules" className="gap-1"><Lock className="w-4 h-4" />{isZh ? "规则与禁令" : "Rules"}</TabsTrigger>
        </TabsList>
        <TabsContent value="submit"><SubmitTab /></TabsContent>
        <TabsContent value="approve"><ApproveTab /></TabsContent>
        <TabsContent value="history"><HistoryTab /></TabsContent>
        <TabsContent value="rules"><RulesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function SubmitTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";
  const [changeType, setChangeType] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [reason, setReason] = useState("");
  const [impact, setImpact] = useState("");
  const [rollback, setRollback] = useState("");
  const typesQ = trpc.changeControl.getChangeTypes.useQuery(undefined, { retry: false });
  const types = typesQ.data as any;
  const submitMut = trpc.changeControl.submitRequest.useMutation({
    onSuccess: (d) => { toast({ title: `变更 ${d.code} ${d.status === "approved" ? "已自动批准" : "已提交待审批"}`, description: d.message }); setTitle(""); setDesc(""); setReason(""); },
    onError: (e) => toast({ title: "提交失败", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="mt-4 max-w-2xl space-y-4">
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
        <CardContent className="p-4 text-sm">
          <AlertTriangle className="w-4 h-4 inline text-amber-600 mr-1" />
          {isZh ? "较大工程变更需在系统内申请说明，获批后方可执行。Critical/Major级需董事长或副总签字。" : "Major changes require approval before execution."}
        </CardContent>
      </Card>
      <div>
        <label className="text-xs font-medium">{isZh ? "变更类型 *" : "Change Type *"}</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
          {types && Object.entries(types).map(([key, val]: any) => {
            const sev = SEVERITY_CONFIG[val.severity] || SEVERITY_CONFIG.standard;
            return (
              <button key={key} onClick={() => setChangeType(key)} className={`p-2 rounded border text-left text-xs ${changeType === key ? "border-primary bg-primary/5" : "hover:border-primary/30"}`}>
                <Badge className={`text-[9px] ${sev.bgColor} ${sev.color}`}>{sev.label}</Badge>
                <p className="font-medium mt-1">{val.label}</p>
                <p className="text-[10px] text-muted-foreground">{val.approvers}</p>
              </button>
            );
          })}
        </div>
      </div>
      <div><label className="text-xs font-medium">{isZh ? "变更标题 *" : "Title *"}</label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isZh ? "简要描述变更内容（≥5字）" : "Brief description"} /></div>
      <div><label className="text-xs font-medium">{isZh ? "详细描述 *" : "Description *"}</label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={isZh ? "详细说明变更内容、涉及的模块、技术方案（≥20字）" : "Detailed description"} rows={4} /></div>
      <div><label className="text-xs font-medium">{isZh ? "变更原因 *" : "Reason *"}</label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={isZh ? "为什么需要这个变更？解决什么问题？（≥10字）" : "Why is this change needed?"} rows={2} /></div>
      <div><label className="text-xs font-medium">{isZh ? "影响范围" : "Impact Scope"}</label><Input value={impact} onChange={(e) => setImpact(e.target.value)} placeholder={isZh ? "影响哪些模块/用户/数据" : "Affected modules/users/data"} /></div>
      <div><label className="text-xs font-medium">{isZh ? "回滚方案" : "Rollback Plan"}</label><Input value={rollback} onChange={(e) => setRollback(e.target.value)} placeholder={isZh ? "如果出问题如何回退" : "How to revert if issues"} /></div>
      <Button className="w-full" onClick={() => submitMut.mutate({ changeType, title, description: desc, reason, impactScope: impact || undefined, rollbackPlan: rollback || undefined })} disabled={!changeType || !title || title.length < 5 || desc.length < 20 || reason.length < 10 || submitMut.isPending}>
        <Send className="w-4 h-4 mr-1" />{isZh ? "提交变更申请" : "Submit Change Request"}
      </Button>
    </div>
  );
}

function ApproveTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";
  const utils = trpc.useUtils();
  const pendingQ = trpc.changeControl.list.useQuery({ status: "pending" }, { retry: false });
  const pending = (pendingQ.data as any[]) || [];
  const approveMut = trpc.changeControl.approveRequest.useMutation({
    onSuccess: (d) => { toast({ title: `${d.code} ${d.status === "approved" ? "已批准" : "已拒绝"}` }); utils.changeControl.list.invalidate(); },
    onError: (e) => toast({ title: "操作失败", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-sm font-semibold">{isZh ? "待审批变更" : "Pending Approvals"} ({pending.length})</h3>
      {pending.length === 0 && <p className="text-center text-muted-foreground py-8">{isZh ? "暂无待审批变更" : "No pending changes"}</p>}
      {pending.map((req: any) => {
        const sev = SEVERITY_CONFIG[req.severity] || SEVERITY_CONFIG.standard;
        return (
          <Card key={req.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] ${sev.bgColor} ${sev.color}`}>{sev.label}</Badge>
                  <span className="font-mono text-xs">{req.request_code}</span>
                  <span className="text-xs text-muted-foreground">{req.requester_name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleString()}</span>
              </div>
              <p className="font-semibold text-sm">{req.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{req.description}</p>
              <p className="text-xs mt-1"><strong>{isZh ? "原因：" : "Reason: "}</strong>{req.reason}</p>
              {req.impact_scope && <p className="text-xs"><strong>{isZh ? "影响：" : "Impact: "}</strong>{req.impact_scope}</p>}
              {req.rollback_plan && <p className="text-xs"><strong>{isZh ? "回滚：" : "Rollback: "}</strong>{req.rollback_plan}</p>}
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => approveMut.mutate({ requestCode: req.request_code, approved: true })}><ThumbsUp className="w-3.5 h-3.5 mr-1" />{isZh ? "批准" : "Approve"}</Button>
                <Button size="sm" variant="destructive" onClick={() => approveMut.mutate({ requestCode: req.request_code, approved: false, comment: "需要更多信息" })}><ThumbsDown className="w-3.5 h-3.5 mr-1" />{isZh ? "拒绝" : "Reject"}</Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function HistoryTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";
  const historyQ = trpc.changeControl.list.useQuery({}, { retry: false });
  const history = (historyQ.data as any[]) || [];
  const executeMut = trpc.changeControl.markExecuted.useMutation({
    onSuccess: () => { toast({ title: isZh ? "已标记执行" : "Marked executed" }); historyQ.refetch(); },
    onError: (e) => toast({ title: "失败", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="mt-4 space-y-2">
      {history.map((req: any) => {
        const sev = SEVERITY_CONFIG[req.severity] || SEVERITY_CONFIG.standard;
        const st = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
        const StIcon = st.icon;
        return (
          <div key={req.id} className="flex items-center gap-3 p-3 rounded border">
            <StIcon className={`w-4 h-4 flex-shrink-0 ${st.color}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px]">{req.request_code}</span>
                <Badge className={`text-[9px] ${sev.bgColor} ${sev.color}`}>{sev.label}</Badge>
              </div>
              <p className="text-xs font-medium truncate">{req.title}</p>
              <p className="text-[10px] text-muted-foreground">{req.requester_name} · {new Date(req.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={req.status === "approved" ? "default" : req.status === "executed" ? "secondary" : req.status === "rejected" ? "destructive" : "outline"} className="text-[10px]">{st.label}</Badge>
              {req.status === "approved" && (
                <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => executeMut.mutate({ requestCode: req.request_code, result: "执行完成" })}>
                  <Play className="w-3 h-3 mr-0.5" />{isZh ? "执行" : "Execute"}
                </Button>
              )}
            </div>
          </div>
        );
      })}
      {history.length === 0 && <p className="text-center text-muted-foreground py-8">{isZh ? "暂无变更记录" : "No records"}</p>}
    </div>
  );
}

function RulesTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const blockedQ = trpc.changeControl.getBlockedOperations.useQuery(undefined, { retry: false });
  const blocked = (blockedQ.data as string[]) || [];

  return (
    <div className="mt-4 space-y-4 max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="text-base">{isZh ? "变更分级制度" : "Change Classification"}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[
            { level: "L4 Critical", rule: isZh ? "架构重构·DB Schema·生产数据迁移 → 董事长+副总双签" : "Architecture/DB/Data migration → Dual sign-off", color: "border-red-300 bg-red-50" },
            { level: "L3 Major", rule: isZh ? "大功能模块·路由重构·权限变更·安全配置 → 副总签字" : "Major features/permissions → VP approval", color: "border-orange-300 bg-orange-50" },
            { level: "L2 Standard", rule: isZh ? "常规功能·Bug修复·UI优化 → 自动批准(需记录)" : "Standard features/bugs → Auto-approved (logged)", color: "border-blue-300 bg-blue-50" },
            { level: "L1 Minor", rule: isZh ? "配置调整·文案修改·样式微调 → 无需审批" : "Config/text/style → No approval needed", color: "border-green-300 bg-green-50" },
          ].map((r, i) => (
            <div key={i} className={`p-3 rounded border ${r.color}`}>
              <span className="text-xs font-bold">{r.level}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{r.rule}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-red-300 bg-red-50/50 dark:bg-red-950/10">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Ban className="w-5 h-5 text-red-600" />{isZh ? "永久禁止操作" : "Permanently Blocked"}</CardTitle>
          <CardDescription>{isZh ? "以下操作不可申请、不可批准、不可执行" : "Cannot be requested, approved, or executed"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {blocked.map((op, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-red-700">
                <Ban className="w-3 h-3" />{op}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
