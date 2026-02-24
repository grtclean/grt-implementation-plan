import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader, StatusBadge, createStatusColorMap } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  FolderOpen, FileText, Upload, CheckCircle, XCircle, AlertTriangle,
  Clock, User, Sparkles, Loader2, ChevronRight, FileCheck, Search,
} from "lucide-react";
import { STAGES } from "@shared/stage-definitions";

// ============================================================
// Types & Mock Data
// ============================================================

interface ProjectOption { id: number; name: string; currentStage: string; }
interface RequiredDoc { id: string; name: string; type: string; required: boolean; status: "uploaded" | "missing" | "expired"; }
interface UploadedDoc { id: string; name: string; type: string; uploadDate: string; uploader: string; size: string; }

const MOCK_PROJECTS: ProjectOption[] = [
  { id: 1, name: "PRJ-2025-001 宝马汽车零件清洗线", currentStage: "M7" },
  { id: 2, name: "PRJ-2025-002 博世喷油嘴清洗系统", currentStage: "M5" },
  { id: 3, name: "PRJ-2025-003 中航精密件清洗设备", currentStage: "M3" },
  { id: 4, name: "PRJ-2025-004 联影医疗器械清洗线", currentStage: "M10" },
];

const STAGE_REQUIRED_DOCS: Record<string, RequiredDoc[]> = {
  M0: [
    { id: "d1", name: "客户需求调研报告", type: "报告", required: true, status: "uploaded" },
    { id: "d2", name: "初步可行性分析", type: "分析", required: true, status: "uploaded" },
    { id: "d3", name: "商机评估表", type: "表单", required: true, status: "missing" },
  ],
  M1: [
    { id: "d4", name: "详细需求规格书", type: "规格", required: true, status: "uploaded" },
    { id: "d5", name: "技术可行性报告", type: "报告", required: true, status: "uploaded" },
    { id: "d6", name: "风险评估矩阵", type: "矩阵", required: true, status: "missing" },
    { id: "d7", name: "竞品分析报告", type: "报告", required: false, status: "missing" },
  ],
  M3: [
    { id: "d8", name: "立项申请书", type: "申请", required: true, status: "uploaded" },
    { id: "d9", name: "项目预算表", type: "预算", required: true, status: "uploaded" },
    { id: "d10", name: "RACI矩阵", type: "矩阵", required: true, status: "uploaded" },
    { id: "d11", name: "项目计划书", type: "计划", required: true, status: "missing" },
    { id: "d12", name: "资源分配表", type: "表单", required: true, status: "expired" },
  ],
  M5: [
    { id: "d13", name: "机械设计图纸", type: "图纸", required: true, status: "uploaded" },
    { id: "d14", name: "电气原理图", type: "图纸", required: true, status: "uploaded" },
    { id: "d15", name: "BOM清单", type: "清单", required: true, status: "uploaded" },
    { id: "d16", name: "仿真验证报告", type: "报告", required: true, status: "missing" },
    { id: "d17", name: "设计评审记录", type: "记录", required: true, status: "uploaded" },
  ],
  M7: [
    { id: "d18", name: "装配作业指导书", type: "指导", required: true, status: "uploaded" },
    { id: "d19", name: "调试记录表", type: "记录", required: true, status: "uploaded" },
    { id: "d20", name: "质量检测报告", type: "报告", required: true, status: "missing" },
    { id: "d21", name: "不合格品处理记录", type: "记录", required: false, status: "missing" },
  ],
  M8: [
    { id: "d22", name: "FAT测试计划", type: "计划", required: true, status: "uploaded" },
    { id: "d23", name: "FAT测试报告", type: "报告", required: true, status: "missing" },
    { id: "d24", name: "客户签字确认单", type: "确认", required: true, status: "missing" },
  ],
  M10: [
    { id: "d25", name: "现场调试记录", type: "记录", required: true, status: "uploaded" },
    { id: "d26", name: "参数优化报告", type: "报告", required: true, status: "missing" },
    { id: "d27", name: "培训签到表", type: "表单", required: true, status: "uploaded" },
    { id: "d28", name: "客户操作手册", type: "手册", required: true, status: "expired" },
  ],
};

const MOCK_UPLOADED: UploadedDoc[] = [
  { id: "u1", name: "装配作业指导书_v2.1.pdf", type: "指导", uploadDate: "2025-12-01", uploader: "张工", size: "2.4MB" },
  { id: "u2", name: "调试记录表_20251205.xlsx", type: "记录", uploadDate: "2025-12-05", uploader: "王工", size: "856KB" },
  { id: "u3", name: "BOM清单_USC3000_v3.xlsx", type: "清单", uploadDate: "2025-11-28", uploader: "李工", size: "1.2MB" },
  { id: "u4", name: "设计评审会议纪要.docx", type: "记录", uploadDate: "2025-11-20", uploader: "陈经理", size: "345KB" },
];

// ============================================================
// Component
// ============================================================

export default function ProjectPhaseDocuments() {
  const { t } = useLanguage();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [aiChecking, setAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState<{ percent: number; missing: string[] } | null>(null);

  const project = MOCK_PROJECTS.find(p => String(p.id) === selectedProject);
  const requiredDocs = STAGE_REQUIRED_DOCS[selectedStage] ?? [];

  const docStats = useMemo(() => {
    const total = requiredDocs.filter(d => d.required).length;
    const uploaded = requiredDocs.filter(d => d.required && d.status === "uploaded").length;
    const missing = requiredDocs.filter(d => d.required && d.status === "missing").length;
    const expired = requiredDocs.filter(d => d.required && d.status === "expired").length;
    return { total, uploaded, missing, expired, percent: total > 0 ? Math.round((uploaded / total) * 100) : 0 };
  }, [requiredDocs]);

  const handleAICheck = () => {
    setAiChecking(true);
    setAiResult(null);
    setTimeout(() => {
      const missingItems = requiredDocs.filter(d => d.required && d.status !== "uploaded").map(d => d.name);
      setAiResult({ percent: docStats.percent, missing: missingItems });
      setAiChecking(false);
    }, 2000);
  };

  const statusIcon = (status: string) => {
    if (status === "uploaded") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === "expired") return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const docStatusColors = createStatusColorMap({
    uploaded: "green",
    expired: "yellow",
    missing: "red",
  });

  const statusLabelMap: Record<string, string> = {
    uploaded: t("projects.phaseDocs.statusUploaded"),
    expired: t("projects.phaseDocs.statusExpired"),
    missing: t("projects.phaseDocs.statusMissing"),
  };

  const statusLabel = (status: string) => (
    <StatusBadge color={docStatusColors[status] ?? "gray"}>{statusLabelMap[status] ?? status}</StatusBadge>
  );

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={FolderOpen}
          title={t("projects.phaseDocs.title")}
          description={t("projects.phaseDocs.description")}
        />

        {/* Project & Stage Selection */}
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[280px] space-y-1">
            <Label>{t("projects.phaseDocs.selectProject")}</Label>
            <Select value={selectedProject} onValueChange={v => { setSelectedProject(v); setSelectedStage(""); setAiResult(null); }}>
              <SelectTrigger><SelectValue placeholder={t("projects.phaseDocs.selectProjectPlaceholder")} /></SelectTrigger>
              <SelectContent>{MOCK_PROJECTS.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {project && (
            <div className="min-w-[200px] space-y-1">
              <Label>{t("projects.phaseDocs.selectStage")}</Label>
              <Select value={selectedStage} onValueChange={v => { setSelectedStage(v); setAiResult(null); }}>
                <SelectTrigger><SelectValue placeholder={t("projects.phaseDocs.selectStagePlaceholder")} /></SelectTrigger>
                <SelectContent>{STAGES.map(s => <SelectItem key={s.code} value={s.code}>{s.code} - {s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Stage Progress Overview */}
        {project && !selectedStage && (
          <Card>
            <CardHeader><CardTitle className="text-lg">{t("projects.phaseDocs.stageOverview")} - {project.name}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {STAGES.map(s => {
                  const docs = STAGE_REQUIRED_DOCS[s.code];
                  const hasData = docs && docs.length > 0;
                  const isCurrent = s.code === project.currentStage;
                  return (
                    <div key={s.code} className={`p-3 rounded-lg border text-center cursor-pointer hover:border-primary/50 ${isCurrent ? "border-primary bg-primary/5" : ""}`} onClick={() => setSelectedStage(s.code)}>
                      <p className="font-mono font-bold">{s.code}</p>
                      <p className="text-xs text-muted-foreground">{s.name}</p>
                      {hasData && <Badge variant="outline" className="mt-1 text-xs">{docs.filter(d => d.status === "uploaded").length}/{docs.length}</Badge>}
                      {isCurrent && <Badge className="mt-1 text-xs bg-primary">{t("projects.phaseDocs.current")}</Badge>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selected Stage Content */}
        {selectedStage && (
          <div className="space-y-4">
            {/* Progress Summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{t("projects.phaseDocs.docCompleteness")}</span>
                  <span className="text-lg font-bold">{docStats.percent}%</span>
                </div>
                <Progress value={docStats.percent} className="h-2 mb-3" />
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />{t("projects.phaseDocs.uploaded")}: {docStats.uploaded}</span>
                  <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" />{t("projects.phaseDocs.missing")}: {docStats.missing}</span>
                  <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-yellow-500" />{t("projects.phaseDocs.expired")}: {docStats.expired}</span>
                </div>
              </CardContent>
            </Card>

            {/* Required Document Checklist */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><FileCheck className="w-5 h-5" />{t("projects.phaseDocs.requiredDocChecklist")} - {selectedStage}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setShowUploadDialog(!showUploadDialog)}><Upload className="w-4 h-4 mr-1" />{t("projects.phaseDocs.uploadDoc")}</Button>
                    <Button size="sm" variant="outline" onClick={handleAICheck} disabled={aiChecking}>
                      {aiChecking ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />{t("projects.phaseDocs.checking")}</> : <><Sparkles className="w-4 h-4 mr-1" />{t("projects.phaseDocs.aiCompletenessCheck")}</>}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {requiredDocs.map(doc => (
                    <div key={doc.id} className={`flex items-center justify-between p-3 rounded-lg border ${doc.status === "missing" && doc.required ? "border-red-500/30 bg-red-500/5" : ""}`}>
                      <div className="flex items-center gap-3">
                        {statusIcon(doc.status)}
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.type} {!doc.required && t("projects.phaseDocs.optional")}</p>
                        </div>
                      </div>
                      {statusLabel(doc.status)}
                    </div>
                  ))}
                  {requiredDocs.length === 0 && <p className="text-center text-muted-foreground py-4">{t("projects.phaseDocs.noRequiredDocs")}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Uploaded Documents */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-5 h-5" />{t("projects.phaseDocs.uploadedDocs")}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {MOCK_UPLOADED.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{doc.uploader}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{doc.uploadDate}</span>
                            <span>{doc.size}</span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost"><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Completeness Check Result */}
            {aiResult && (
              <Card className={aiResult.percent === 100 ? "border-green-500" : "border-yellow-500"}>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />{t("projects.phaseDocs.aiCheckResult")}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold">{aiResult.percent}%</div>
                    <div>{aiResult.percent === 100 ? <Badge className="bg-green-500/20 text-green-400">{t("projects.phaseDocs.docComplete")}</Badge> : <Badge className="bg-yellow-500/20 text-yellow-400">{t("projects.phaseDocs.docIncomplete")}</Badge>}</div>
                  </div>
                  {aiResult.missing.length > 0 && (
                    <div>
                      <p className="font-medium text-sm mb-2">{t("projects.phaseDocs.missingDocs")}</p>
                      <div className="space-y-1">{aiResult.missing.map(m => (
                        <div key={m} className="flex items-center gap-2 text-sm p-2 rounded bg-red-500/10 text-red-400"><XCircle className="w-4 h-4" />{m}</div>
                      ))}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Upload Dialog */}
            {showUploadDialog && (
              <Card className="border-primary">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="w-5 h-5" />{t("projects.phaseDocs.uploadTitle")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>{t("projects.phaseDocs.docType")}</Label>
                      <Select><SelectTrigger><SelectValue placeholder={t("projects.phaseDocs.selectDocType")} /></SelectTrigger>
                        <SelectContent>
                          {Array.from(new Set(requiredDocs.map(d => d.type))).map(tp => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}
                          <SelectItem value="other">{t("projects.phaseDocs.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>{t("projects.phaseDocs.docDescription")}</Label><Input placeholder={t("projects.phaseDocs.docDescPlaceholder")} /></div>
                  </div>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground"><Upload className="w-8 h-8 mx-auto mb-2" /><p className="text-sm">{t("projects.phaseDocs.dragOrClick")}</p><p className="text-xs mt-1">{t("projects.phaseDocs.supportedFormats")}</p></div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowUploadDialog(false)}>{t("projects.change.cancel")}</Button>
                    <Button onClick={() => setShowUploadDialog(false)}>{t("projects.phaseDocs.confirmUpload")}</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
  );
}
