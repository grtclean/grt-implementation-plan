import { useState, useMemo } from "react";
import { PageHeader, StatusBadge, createStatusColorMap } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen, Search, Plus, FileText, ChevronDown, ChevronUp,
  Clock, User, CheckCircle, AlertCircle, Archive, Edit,
  Copy, Filter, Tag,
} from "lucide-react";
import { STAGES } from "@shared/stage-definitions";
import { useLanguage } from "@/contexts/LanguageContext";

// ============================================================
// Types & Constants
// ============================================================

type SOPCategory = "清洗工艺" | "质量检测" | "设备维护" | "安全操作" | "客户验收" | "包装运输";
type SOPStatus = "draft" | "review" | "approved" | "archived";

interface SOPRecord {
  id: number; code: string; title: string; category: SOPCategory;
  version: string; status: SOPStatus; content: string;
  equipmentModels: string[]; stages: string[]; author: string;
  approver: string; effectiveDate: string;
}

const CATEGORIES: SOPCategory[] = ["清洗工艺", "质量检测", "设备维护", "安全操作", "客户验收", "包装运输"];
const EQUIPMENT_MODELS = ["USC-3000", "USC-2000", "SPR-5000", "SPR-3000", "ASC-5000"];

const STATUS_CONFIG: Record<SOPStatus, { label: string; icon: typeof CheckCircle }> = {
  draft: { label: "草稿", icon: Edit },
  review: { label: "审核中", icon: Clock },
  approved: { label: "已批准", icon: CheckCircle },
  archived: { label: "已归档", icon: Archive },
};

const statusColors = createStatusColorMap({
  draft: "slate",
  review: "yellow",
  approved: "green",
  archived: "slate",
});

const CATEGORY_COLORS: Record<string, string> = {
  "清洗工艺": "bg-blue-500/20 text-blue-400",
  "质量检测": "bg-green-500/20 text-green-400",
  "设备维护": "bg-orange-500/20 text-orange-400",
  "安全操作": "bg-red-500/20 text-red-400",
  "客户验收": "bg-purple-500/20 text-purple-400",
  "包装运输": "bg-cyan-500/20 text-cyan-400",
};

// ============================================================
// Mock Data
// ============================================================

const MOCK_SOPS: SOPRecord[] = [
  { id: 1, code: "SOP-CL-001", title: "超声波清洗标准操作流程", category: "清洗工艺", version: "3.2", status: "approved", content: "1. 准备清洗液，配比浓度3-5%\n2. 设定超声波频率40kHz\n3. 预热至55-60C\n4. 放置工件，清洗时间5-10分钟\n5. 取出工件漂洗\n6. 真空干燥", equipmentModels: ["USC-3000", "USC-2000"], stages: ["M7", "M8"], author: "张工", approver: "李主管", effectiveDate: "2025-06-01" },
  { id: 2, code: "SOP-CL-002", title: "喷淋清洗工艺规范", category: "清洗工艺", version: "2.1", status: "approved", content: "1. 检查喷嘴状态\n2. 调节喷淋压力至12MPa\n3. 设定清洗温度50C\n4. 启动传送带速度2m/min\n5. 执行多级喷淋清洗\n6. 风刀吹干", equipmentModels: ["SPR-5000", "SPR-3000"], stages: ["M7", "M8", "M10"], author: "王工", approver: "李主管", effectiveDate: "2025-08-01" },
  { id: 3, code: "SOP-QC-001", title: "清洁度检测标准流程", category: "质量检测", version: "4.0", status: "approved", content: "1. 采用重量法检测残留物\n2. 使用颗粒计数器检测颗粒度\n3. 荧光检测表面残留\n4. 记录检测数据\n5. 与客户标准对比\n6. 出具检测报告", equipmentModels: ["USC-3000", "SPR-5000", "ASC-5000"], stages: ["M8", "M11"], author: "陈工", approver: "赵总监", effectiveDate: "2025-04-01" },
  { id: 4, code: "SOP-MT-001", title: "设备日常维护保养规程", category: "设备维护", version: "2.0", status: "approved", content: "1. 每日检查清洗液浓度\n2. 每周清洁过滤器\n3. 每月校准传感器\n4. 每季度更换密封件\n5. 每半年大保养\n6. 记录维护日志", equipmentModels: ["USC-3000", "USC-2000", "SPR-5000", "SPR-3000"], stages: ["M10", "M11", "M12"], author: "刘工", approver: "李主管", effectiveDate: "2025-01-01" },
  { id: 5, code: "SOP-SF-001", title: "清洗设备安全操作规程", category: "安全操作", version: "3.0", status: "approved", content: "1. 操作前检查急停按钮功能\n2. 确认安全门联锁正常\n3. 穿戴防护装备\n4. 遵循LOTO上锁挂牌流程\n5. 化学品安全使用\n6. 紧急情况处理", equipmentModels: ["USC-3000", "USC-2000", "SPR-5000", "ASC-5000"], stages: ["M7", "M8", "M10", "M11"], author: "安全员周", approver: "安全总监", effectiveDate: "2025-03-01" },
  { id: 6, code: "SOP-AC-001", title: "FAT工厂验收测试流程", category: "客户验收", version: "2.5", status: "approved", content: "1. 准备FAT测试计划\n2. 通知客户到场时间\n3. 按检查清单逐项测试\n4. 记录测试数据\n5. 客户签字确认\n6. 整改闭环跟踪", equipmentModels: ["USC-3000", "SPR-5000", "ASC-5000"], stages: ["M8"], author: "项目经理孙", approver: "品质总监", effectiveDate: "2025-05-01" },
  { id: 7, code: "SOP-PK-001", title: "设备包装运输规范", category: "包装运输", version: "1.5", status: "approved", content: "1. 拆卸可拆件并标记\n2. 保护敏感部件\n3. 固定运动件\n4. 防锈处理\n5. 木箱包装加固\n6. 装箱清单核对", equipmentModels: ["USC-3000", "USC-2000", "SPR-5000", "ASC-5000"], stages: ["M9"], author: "物流主管钱", approver: "生产总监", effectiveDate: "2025-02-01" },
  { id: 8, code: "SOP-CL-003", title: "真空干燥工艺操作规范", category: "清洗工艺", version: "1.0", status: "review", content: "1. 检查真空泵运行状态\n2. 将工件放入干燥腔\n3. 关闭腔门并密封\n4. 启动抽真空至-0.09MPa\n5. 加热至80C保持30min\n6. 缓慢释压取件", equipmentModels: ["USC-3000", "ASC-5000"], stages: ["M7", "M8"], author: "张工", approver: "", effectiveDate: "" },
  { id: 9, code: "SOP-QC-002", title: "在线检测系统操作手册", category: "质量检测", version: "0.1", status: "draft", content: "1. 初始化CCD视觉系统\n2. 校准检测参数\n3. 设定合格判定阈值\n4. 启动在线检测模式\n5. 数据自动记录\n6. 异常报警处理", equipmentModels: ["ASC-5000"], stages: ["M7", "M8", "M10"], author: "陈工", approver: "", effectiveDate: "" },
];

// ============================================================
// Component
// ============================================================

export default function SOPLibrary() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSOP, setNewSOP] = useState({ title: "", category: "" as string, content: "", equipmentModels: [] as string[], stages: [] as string[] });

  const filteredSOPs = useMemo(() => {
    let result = [...MOCK_SOPS];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    }
    if (categoryFilter !== "all") result = result.filter(s => s.category === categoryFilter);
    if (statusFilter !== "all") result = result.filter(s => s.status === statusFilter);
    return result;
  }, [searchQuery, categoryFilter, statusFilter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORIES) { counts[cat] = MOCK_SOPS.filter(s => s.category === cat).length; }
    return counts;
  }, []);

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={BookOpen}
          title={t("quality.sop.title")}
          description={t("quality.sop.description")}
          actions={
            <Button onClick={() => setShowCreateDialog(!showCreateDialog)}>
              <Plus className="w-4 h-4 mr-2" />{t("quality.sop.createSOP")}
            </Button>
          }
        />

        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list"><FileText className="w-4 h-4 mr-1" />{t("quality.sop.tabList")}</TabsTrigger>
            <TabsTrigger value="categories"><Tag className="w-4 h-4 mr-1" />{t("quality.sop.tabCategories")}</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={t("quality.sop.search")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]"><Filter className="w-4 h-4 mr-1" /><SelectValue placeholder={t("quality.sop.categoryField")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("quality.sop.allCategories")}</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder={t("quality.common.status")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("quality.sop.allStatuses")}</SelectItem>
                  <SelectItem value="draft">{t("quality.sop.statusDraft")}</SelectItem>
                  <SelectItem value="review">{t("quality.sop.statusReviewing")}</SelectItem>
                  <SelectItem value="approved">{t("quality.sop.statusApproved")}</SelectItem>
                  <SelectItem value="archived">{t("quality.sop.statusArchived")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">{filteredSOPs.length} {t("quality.sop.sopRecords")}</p>

            {/* SOP List */}
            <div className="space-y-3">
              {filteredSOPs.map(sop => {
                const statusLabelMap: Record<SOPStatus, string> = { draft: t("quality.sop.statusDraft"), review: t("quality.sop.statusReviewing"), approved: t("quality.sop.statusApproved"), archived: t("quality.sop.statusArchived") };
                const isExpanded = expandedId === sop.id;
                return (
                  <Card key={sop.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setExpandedId(isExpanded ? null : sop.id)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-muted-foreground">{sop.code}</span>
                            <CardTitle className="text-base">{sop.title}</CardTitle>
                            <Badge className={CATEGORY_COLORS[sop.category]}>{({ "清洗工艺": t("quality.sop.categoryCleaning"), "质量检测": t("quality.sop.categoryQuality"), "设备维护": t("quality.sop.categoryMaintenance"), "安全操作": t("quality.sop.categorySafety"), "客户验收": t("quality.sop.categoryAcceptance"), "包装运输": t("quality.sop.categoryPackaging") } as Record<string, string>)[sop.category] ?? sop.category}</Badge>
                            <StatusBadge color={statusColors[sop.status]}>{statusLabelMap[sop.status]}</StatusBadge>
                            <Badge variant="outline">v{sop.version}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{sop.author}</span>
                            {sop.effectiveDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t("quality.sop.effectiveDate")} {sop.effectiveDate}</span>}
                            <span>{t("quality.sop.applicableEquipment")} {sop.equipmentModels.join(", ")}</span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="pt-0 space-y-3" onClick={e => e.stopPropagation()}>
                        <div className="border-t pt-3">
                          <h4 className="font-medium mb-2">{t("quality.sop.operationLabel")}</h4>
                          <pre className="whitespace-pre-wrap text-sm bg-muted/50 rounded p-3">{sop.content}</pre>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-sm text-muted-foreground mr-1">{t("quality.sop.phaseLabel")}:</span>
                          {sop.stages.map(s => { const stage = STAGES.find(st => st.code === s); return <Badge key={s} variant="outline" className="text-xs">{s} {stage?.name}</Badge>; })}
                        </div>
                        {sop.approver && <p className="text-sm text-muted-foreground">{t("quality.sop.approverLabel")}: {sop.approver}</p>}
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline"><Copy className="w-3 h-3 mr-1" />{t("quality.sop.createNewVersion")}</Button>
                          <Button size="sm" variant="outline"><Edit className="w-3 h-3 mr-1" />{t("quality.sop.edit")}</Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="categories">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATEGORIES.map(cat => (
                <Card key={cat} className="cursor-pointer hover:border-primary/50" onClick={() => { setCategoryFilter(cat); }}>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Badge className={CATEGORY_COLORS[cat]}>{({ "清洗工艺": t("quality.sop.categoryCleaning"), "质量检测": t("quality.sop.categoryQuality"), "设备维护": t("quality.sop.categoryMaintenance"), "安全操作": t("quality.sop.categorySafety"), "客户验收": t("quality.sop.categoryAcceptance"), "包装运输": t("quality.sop.categoryPackaging") } as Record<string, string>)[cat] ?? cat}</Badge></CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold">{categoryCounts[cat]}</p><p className="text-sm text-muted-foreground">{t("quality.sop.sopCount")}</p></CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create SOP Dialog - inline panel */}
        {showCreateDialog && (
          <Card className="border-primary">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="w-5 h-5" />{t("quality.sop.createSOP")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t("quality.sop.sopTitle")}</Label><Input placeholder={t("quality.sop.sopTitle")} value={newSOP.title} onChange={e => setNewSOP(p => ({ ...p, title: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("quality.sop.categoryField")}</Label>
                  <Select value={newSOP.category} onValueChange={v => setNewSOP(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder={t("quality.sop.categoryField")} /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>{t("quality.sop.equipmentModel")}</Label>
                  <div className="flex flex-wrap gap-2">{EQUIPMENT_MODELS.map(m => (<Badge key={m} variant={newSOP.equipmentModels.includes(m) ? "default" : "outline"} className="cursor-pointer" onClick={() => setNewSOP(p => ({ ...p, equipmentModels: p.equipmentModels.includes(m) ? p.equipmentModels.filter(x => x !== m) : [...p.equipmentModels, m] }))}>{m}</Badge>))}</div>
                </div>
                <div className="space-y-2"><Label>{t("quality.sop.applicablePhase")}</Label>
                  <div className="flex flex-wrap gap-2">{STAGES.map(s => (<Badge key={s.code} variant={newSOP.stages.includes(s.code) ? "default" : "outline"} className="cursor-pointer" onClick={() => setNewSOP(p => ({ ...p, stages: p.stages.includes(s.code) ? p.stages.filter(x => x !== s.code) : [...p.stages, s.code] }))}>{s.code} {s.name}</Badge>))}</div>
                </div>
              </div>
              <div className="space-y-2"><Label>{t("quality.sop.operationContent")}</Label><Textarea placeholder={t("quality.sop.operationContent")} value={newSOP.content} onChange={e => setNewSOP(p => ({ ...p, content: e.target.value }))} rows={5} /></div>
              <div className="space-y-2"><Label>{t("quality.sop.attachmentUpload")}</Label><div className="border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground"><AlertCircle className="w-6 h-6 mx-auto mb-2" /><p className="text-sm">{t("quality.sop.dragOrClickUpload")}</p></div></div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t("quality.sop.cancel")}</Button>
                <Button onClick={() => setShowCreateDialog(false)}>{t("quality.sop.saveDraft")}</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
