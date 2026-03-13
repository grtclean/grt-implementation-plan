/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Electrical Standards Governance Workbench                  ║
 * ║  电气规范治理平台                                            ║
 * ║  CE / UL / GB / SEMI / OEM 客户电气规范大全                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Shield, ShieldCheck, ShieldAlert, Zap, BookOpen, Building2, FolderLock,
  ClipboardCheck, AlertTriangle, BarChart3, Plus, Lock, Search,
  CheckCircle2, XCircle, Eye, ChevronRight, FileText, Globe,
} from "lucide-react";

// ── Framework badges ───────────────────────────────────────────

const FW_COLORS: Record<string, string> = {
  CE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  UL: "bg-red-500/20 text-red-400 border-red-500/30",
  CSA: "bg-red-400/20 text-red-300 border-red-400/30",
  GB: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  IEC: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  NFPA: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  SEMI: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  OEM_CUSTOM: "bg-green-500/20 text-green-400 border-green-500/30",
};

const CATEGORY_LABELS: Record<string, string> = {
  power_supply: "供电规范",
  motor_drive: "电机驱动",
  plc_control: "PLC控制",
  hmi_interface: "人机界面",
  safety_circuit: "安全回路",
  wiring_cable: "布线电缆",
  panel_enclosure: "电柜防护",
  sensor_instrumentation: "传感器仪表",
  communication: "通讯协议",
  grounding_emc: "接地/EMC",
  marking_labeling: "标识铭牌",
  documentation: "图纸文档",
  remote_access: "远程接入",
  cybersecurity: "工控安全",
};

const SEVERITY_COLORS: Record<string, string> = {
  OBSERVATION: "bg-slate-500/20 text-slate-400",
  MINOR: "bg-yellow-500/20 text-yellow-400",
  MAJOR: "bg-orange-500/20 text-orange-400",
  CRITICAL: "bg-red-500/20 text-red-400",
};

const CHECK_STATUS_COLORS: Record<string, { color: string; label: string }> = {
  NOT_CHECKED: { color: "bg-slate-600/30 text-slate-300", label: "未检查" },
  PASS: { color: "bg-green-500/20 text-green-400", label: "通过" },
  FAIL: { color: "bg-red-500/20 text-red-400", label: "不通过" },
  WAIVED: { color: "bg-yellow-500/20 text-yellow-400", label: "豁免" },
  N_A: { color: "bg-slate-500/20 text-slate-400", label: "不适用" },
};

// ── Tab 1: Standards Library ───────────────────────────────────

function StandardsLibraryTab() {
  const [fwFilter, setFwFilter] = useState<string>("");
  const [catFilter, setCatFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<any>(null);

  const params: any = {};
  if (fwFilter) params.framework = fwFilter;
  if (catFilter) params.category = catFilter;
  if (search) params.search = search;
  const stdsQ = trpc.electricalStandards.standards.list.useQuery(Object.keys(params).length > 0 ? params : undefined);
  const statsQ = trpc.electricalStandards.standards.statsByFramework.useQuery();

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {statsQ.data && (
        <div className="flex gap-3 flex-wrap">
          {statsQ.data.map((s: any) => (
            <Badge key={s.framework} variant="outline" className={`${FW_COLORS[s.framework] ?? ""} text-sm px-3 py-1`}>
              {s.framework}: {s.count}项
            </Badge>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索标准名称..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={fwFilter} onValueChange={setFwFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="框架" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部框架</SelectItem>
            {["CE", "UL", "GB", "NFPA", "SEMI", "IEC"].map((fw) => (
              <SelectItem key={fw} value={fw}>{fw}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="类别" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类别</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Standards grid */}
      <div className="grid gap-3">
        {stdsQ.data?.map((std: any) => (
          <Card key={std.id} className="hover:border-blue-500/30 transition-colors cursor-pointer" onClick={() => setDetail(std)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={FW_COLORS[std.framework] ?? ""}>{std.framework}</Badge>
                    <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[std.category] ?? std.category}</Badge>
                    <code className="text-xs font-mono text-muted-foreground">{std.code} v{std.version}</code>
                  </div>
                  <p className="font-medium">{std.title}</p>
                  {std.titleEn && <p className="text-sm text-muted-foreground">{std.titleEn}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {std.applicableRegions && (std.applicableRegions as string[]).map((r: string) => (
                    <Badge key={r} variant="outline" className="text-xs"><Globe className="w-3 h-3 mr-1" />{r}</Badge>
                  ))}
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              {std.keyRequirements && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(std.keyRequirements as string[]).slice(0, 3).map((req: string, i: number) => (
                    <span key={i} className="text-xs text-muted-foreground bg-slate-800/50 px-2 py-0.5 rounded">{req.slice(0, 50)}{req.length > 50 ? "..." : ""}</span>
                  ))}
                  {(std.keyRequirements as string[]).length > 3 && <span className="text-xs text-muted-foreground">+{(std.keyRequirements as string[]).length - 3} more</span>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className={FW_COLORS[detail?.framework] ?? ""}>{detail?.framework}</Badge>
              {detail?.code} v{detail?.version}
            </DialogTitle>
            <DialogDescription>{detail?.title}{detail?.titleEn ? ` — ${detail.titleEn}` : ""}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              {detail.description && <p className="text-sm">{detail.description}</p>}
              {detail.referenceDoc && <p className="text-sm"><FileText className="w-3.5 h-3.5 inline mr-1" />参考文件: {detail.referenceDoc}</p>}
              {detail.applicableVoltages && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">适用电压</p>
                  <div className="flex gap-2">{(detail.applicableVoltages as string[]).map((v: string) => <Badge key={v} variant="outline">{v}</Badge>)}</div>
                </div>
              )}
              {detail.keyRequirements && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">核心要求</p>
                  <ul className="space-y-1">{(detail.keyRequirements as string[]).map((r: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-green-400 flex-shrink-0" />{r}</li>
                  ))}</ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab 2: Customer Profiles ───────────────────────────────────

function CustomerProfilesTab() {
  const profilesQ = trpc.electricalStandards.customerProfile.list.useQuery();
  const [detail, setDetail] = useState<any>(null);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profilesQ.data?.map((p: any) => (
          <Card key={p.id} className="hover:border-blue-500/30 transition-colors cursor-pointer" onClick={() => setDetail(p)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{p.customerName}</CardTitle>
                <Badge variant="outline" className={FW_COLORS[p.baseFramework] ?? ""}>{p.baseFramework}</Badge>
              </div>
              <CardDescription className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />{p.region}
                {p.buCode && <Badge variant="outline" className="text-xs">{p.buCode}</Badge>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {p.voltageSpec && <><span className="text-muted-foreground">电压</span><span>{p.voltageSpec}</span></>}
                {p.safetyLevel && <><span className="text-muted-foreground">安全等级</span><span>{p.safetyLevel}</span></>}
                {p.plcPlatform && <><span className="text-muted-foreground">PLC</span><span>{p.plcPlatform}</span></>}
                {p.commProtocol && <><span className="text-muted-foreground">通讯</span><span>{p.commProtocol}</span></>}
                {p.panelIpRating && <><span className="text-muted-foreground">防护</span><span>{p.panelIpRating}</span></>}
              </div>
              {p.overlayStandards && (
                <div className="flex flex-wrap gap-1">
                  {(p.overlayStandards as string[]).map((s: string) => (
                    <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.customerName} — 电气规范档案</DialogTitle>
            <DialogDescription>{detail?.region} / {detail?.baseFramework} / {detail?.buCode}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-slate-800/50"><span className="text-xs text-muted-foreground block">电压规格</span>{detail.voltageSpec}</div>
                <div className="p-2 rounded bg-slate-800/50"><span className="text-xs text-muted-foreground block">安全等级</span>{detail.safetyLevel}</div>
                <div className="p-2 rounded bg-slate-800/50"><span className="text-xs text-muted-foreground block">PLC平台</span>{detail.plcPlatform}</div>
                <div className="p-2 rounded bg-slate-800/50"><span className="text-xs text-muted-foreground block">HMI平台</span>{detail.hmiPlatform}</div>
                <div className="p-2 rounded bg-slate-800/50"><span className="text-xs text-muted-foreground block">通讯协议</span>{detail.commProtocol}</div>
                <div className="p-2 rounded bg-slate-800/50"><span className="text-xs text-muted-foreground block">电柜防护</span>{detail.panelIpRating}</div>
              </div>
              {detail.cableSpec && <div className="p-2 rounded bg-slate-800/50"><span className="text-xs text-muted-foreground block">电缆规格</span>{detail.cableSpec}</div>}
              {detail.specialRequirements && <div className="p-3 rounded bg-amber-950/20 border border-amber-500/20"><span className="text-xs text-amber-400 block mb-1">特殊要求</span>{detail.specialRequirements}</div>}
              {detail.documentLanguages && <p><span className="text-muted-foreground">交付语言: </span>{(detail.documentLanguages as string[]).join(", ")}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab 3: Project Standards ───────────────────────────────────

function ProjectStandardsTab() {
  const projectsQ = trpc.electricalStandards.projectSelection.list.useQuery();

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {projectsQ.data?.map((p: any) => (
          <Card key={p.id} className={`${p.lockedAt ? "border-green-500/30" : "border-amber-500/20"}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {p.lockedAt ? (
                    <div className="p-1.5 rounded-lg bg-green-500/20"><Lock className="w-4 h-4 text-green-400" /></div>
                  ) : (
                    <div className="p-1.5 rounded-lg bg-amber-500/20"><FolderLock className="w-4 h-4 text-amber-400" /></div>
                  )}
                  <div>
                    <p className="font-semibold">{p.projectCode} {p.projectName ? `— ${p.projectName}` : ""}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {p.applicablePhases && (p.applicablePhases as string[]).map((ph: string) => (
                        <Badge key={ph} variant="outline" className="text-[10px]">{ph}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {p.lockedAt ? (
                    <Badge className="bg-green-500/20 text-green-400">M3已冻结</Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-400">设计中</Badge>
                  )}
                  {p.designBasis && (
                    <p className="text-xs text-muted-foreground mt-1">{(p.designBasis as any).voltage} / {(p.designBasis as any).plcPlatform}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!projectsQ.data || projectsQ.data.length === 0) && (
          <p className="text-center py-8 text-muted-foreground">暂无项目规范选型记录。在项目立项(M0)时创建。</p>
        )}
      </div>
    </div>
  );
}

// ── Tab 4: Review Rules ────────────────────────────────────────

function ReviewRulesTab() {
  const rulesQ = trpc.electricalStandards.reviewRule.list.useQuery();
  const phases = ["M0", "M1", "M3", "M7", "M8", "M11"];

  return (
    <div className="space-y-6">
      {phases.map((phase) => {
        const phaseRules = (rulesQ.data ?? []).filter((r: any) => r.phase === phase);
        if (phaseRules.length === 0) return null;
        return (
          <div key={phase}>
            <h3 className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2">
              <Badge variant="outline" className="text-base">{phase}</Badge>
              {phase === "M0" && "立项"}{phase === "M3" && "方案评审"}{phase === "M7" && "装配检查"}{phase === "M8" && "FAT验收"}{phase === "M11" && "SAT现场"}
            </h3>
            <div className="grid gap-2">
              {phaseRules.map((rule: any) => (
                <Card key={rule.id} className="border-slate-700/50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={FW_COLORS[rule.framework] ?? ""}>{rule.framework}</Badge>
                        <code className="text-xs font-mono">{rule.ruleCode}</code>
                        <span className="text-sm font-medium">{rule.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {rule.isBlocking && <Badge className="bg-red-500/20 text-red-400 text-xs">阻断</Badge>}
                        {rule.requiredApprovers && <span className="text-xs text-muted-foreground">审批人: {(rule.requiredApprovers as string[]).join(", ")}</span>}
                      </div>
                    </div>
                    {rule.checklistTemplate && (
                      <div className="grid grid-cols-2 gap-1">
                        {(rule.checklistTemplate as string[]).map((item: string, i: number) => (
                          <div key={i} className="text-xs flex items-start gap-1.5 text-muted-foreground">
                            <ClipboardCheck className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-400" />{item}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab 5: Complaints ──────────────────────────────────────────

function ComplaintsTab() {
  const complaintsQ = trpc.electricalStandards.complaint.list.useQuery();
  const statsQ = trpc.electricalStandards.complaint.stats.useQuery();

  return (
    <div className="space-y-4">
      {/* Stats */}
      {statsQ.data && (
        <div className="flex gap-3 flex-wrap">
          {statsQ.data.bySeverity.map((s: any) => (
            <Badge key={s.severity} variant="outline" className={`${SEVERITY_COLORS[s.severity] ?? ""} gap-1`}>
              {s.severity}: {s.count}
            </Badge>
          ))}
        </div>
      )}

      {/* Complaint cards */}
      <div className="grid gap-3">
        {complaintsQ.data?.map((c: any) => (
          <Card key={c.id} className={c.severity === "CRITICAL" ? "border-red-500/30" : "border-slate-700/50"}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={SEVERITY_COLORS[c.severity] ?? ""}>{c.severity}</Badge>
                    <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[c.category] ?? c.category}</Badge>
                    <code className="text-xs font-mono text-muted-foreground">{c.complaintNumber}</code>
                  </div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-sm text-muted-foreground">{c.customerName} — {c.equipmentModel} — {c.projectCode}</p>
                </div>
                <Badge variant="outline" className={c.status === "open" ? "bg-red-500/20 text-red-400" : c.status === "resolved" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                  {c.status}
                </Badge>
              </div>
              <p className="text-sm">{c.description}</p>
              {c.rootCause && (
                <div className="p-2 rounded bg-red-950/20 border border-red-500/10 text-sm">
                  <span className="text-xs text-red-400 font-semibold">根因: </span>{c.rootCause}
                </div>
              )}
              {c.correctiveAction && (
                <div className="p-2 rounded bg-green-950/20 border border-green-500/10 text-sm">
                  <span className="text-xs text-green-400 font-semibold">纠正措施: </span>{c.correctiveAction}
                </div>
              )}
              {c.preventiveAction && (
                <div className="p-2 rounded bg-blue-950/20 border border-blue-500/10 text-sm">
                  <span className="text-xs text-blue-400 font-semibold">预防措施: </span>{c.preventiveAction}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function ElectricalStandardsWorkbench() {
  const overviewQ = trpc.electricalStandards.dashboard.overview.useQuery();
  const ov = overviewQ.data;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20">
          <Zap className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">电气规范治理平台</h1>
          <p className="text-muted-foreground">Electrical Standards Governance — CE / UL / GB / SEMI / OEM Customer Profiles</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-blue-500/20 bg-blue-950/10">
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-blue-400" />
            <div><p className="text-2xl font-bold">{ov?.activeStandardCount ?? "—"}</p><p className="text-xs text-muted-foreground">有效标准</p></div>
          </CardContent>
        </Card>
        <Card className="border-purple-500/20 bg-purple-950/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="w-7 h-7 text-purple-400" />
            <div><p className="text-2xl font-bold">{ov?.customerProfileCount ?? "—"}</p><p className="text-xs text-muted-foreground">客户档案</p></div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-950/10">
          <CardContent className="p-4 flex items-center gap-3">
            <FolderLock className="w-7 h-7 text-green-400" />
            <div><p className="text-2xl font-bold">{ov?.projectSelectionCount ?? "—"}</p><p className="text-xs text-muted-foreground">项目选型</p></div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-amber-950/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
            <div><p className="text-2xl font-bold">{ov?.openComplaintCount ?? "—"}</p><p className="text-xs text-muted-foreground">待处理投诉</p></div>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-red-950/10">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-red-400" />
            <div><p className="text-2xl font-bold">{ov?.criticalComplaintCount ?? "—"}</p><p className="text-xs text-muted-foreground">重大投诉</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="standards" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="standards" className="gap-1"><BookOpen className="w-4 h-4" /> 标准库</TabsTrigger>
          <TabsTrigger value="customers" className="gap-1"><Building2 className="w-4 h-4" /> 客户档案</TabsTrigger>
          <TabsTrigger value="projects" className="gap-1"><FolderLock className="w-4 h-4" /> 项目选型</TabsTrigger>
          <TabsTrigger value="rules" className="gap-1"><ClipboardCheck className="w-4 h-4" /> 评审规则</TabsTrigger>
          <TabsTrigger value="complaints" className="gap-1"><AlertTriangle className="w-4 h-4" /> 投诉追踪</TabsTrigger>
        </TabsList>

        <TabsContent value="standards"><StandardsLibraryTab /></TabsContent>
        <TabsContent value="customers"><CustomerProfilesTab /></TabsContent>
        <TabsContent value="projects"><ProjectStandardsTab /></TabsContent>
        <TabsContent value="rules"><ReviewRulesTab /></TabsContent>
        <TabsContent value="complaints"><ComplaintsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
