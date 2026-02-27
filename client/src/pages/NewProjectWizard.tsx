/**
 * New Project Wizard — 新项目向导 (/operations/new-project)
 *
 * 3-step wizard: M0 Requirements → M1 AI Suggestion/Quotation → M2 Summary & Create.
 * Uses mock AI responses since cleaningProject backend only has a stub `list` procedure.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FileText,
  Cpu,
  Loader2,
  Zap,
  Factory,
  ClipboardList,
} from "lucide-react";

type CleaningType = "spray" | "ultrasonic" | "immersion" | "combination";
type AutomationLevel = "manual" | "semi" | "full";

interface FormData {
  projectName: string;
  cleaningType: CleaningType;
  automation: AutomationLevel;
  volume: string;
  description: string;
}

const CLEANING_TYPES: { value: CleaningType; labelZh: string; labelEn: string }[] = [
  { value: "spray",       labelZh: "喷淋清洗", labelEn: "Spray" },
  { value: "ultrasonic",  labelZh: "超声清洗", labelEn: "Ultrasonic" },
  { value: "immersion",   labelZh: "浸泡清洗", labelEn: "Immersion" },
  { value: "combination", labelZh: "组合清洗", labelEn: "Combination" },
];

const AUTOMATION_LEVELS: { value: AutomationLevel; labelZh: string; labelEn: string }[] = [
  { value: "manual", labelZh: "手动",   labelEn: "Manual" },
  { value: "semi",   labelZh: "半自动", labelEn: "Semi-Auto" },
  { value: "full",   labelZh: "全自动", labelEn: "Full-Auto" },
];

const STEPS = [
  { labelZh: "M0 需求定义", labelEn: "M0 Requirements" },
  { labelZh: "M1 AI 方案",  labelEn: "M1 AI Suggestion" },
  { labelZh: "M2 确认创建", labelEn: "M2 Create Project" },
];

// Mock AI suggestion
function mockSuggestion(form: FormData) {
  const platformMap: Record<CleaningType, string> = {
    spray: "GRT-SP Series Spray Platform",
    ultrasonic: "GRT-US Series Ultrasonic Platform",
    immersion: "GRT-IM Series Immersion Platform",
    combination: "GRT-CB Series Combination Platform",
  };
  return {
    platform: platformMap[form.cleaningType],
    confidence: 87,
    features: [
      form.automation === "full" ? "PLC全自动控制" : form.automation === "semi" ? "半自动上下料" : "手动操作",
      form.cleaningType === "ultrasonic" ? "多频超声 (28/40/68kHz)" : "高压喷淋系统",
      "304不锈钢槽体",
      "废液集中处理",
    ],
  };
}

function mockQuotation(form: FormData) {
  const basePrice = form.automation === "full" ? 580000 : form.automation === "semi" ? 380000 : 180000;
  const typeAdj = form.cleaningType === "combination" ? 1.3 : form.cleaningType === "ultrasonic" ? 1.15 : 1.0;
  const total = Math.round(basePrice * typeAdj);
  return {
    basePrice,
    typeAdjustment: `×${typeAdj}`,
    installFee: Math.round(total * 0.15),
    trainingFee: 80000,
    total: total + Math.round(total * 0.15) + 80000,
    deliveryWeeks: form.automation === "full" ? 16 : 10,
  };
}

export default function NewProjectWizard() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState<FormData>({
    projectName: "",
    cleaningType: "spray",
    automation: "semi",
    volume: "",
    description: "",
  });

  const suggestion = step >= 1 ? mockSuggestion(form) : null;
  const quotation = step >= 1 ? mockQuotation(form) : null;

  const canProceedStep0 = form.projectName.trim().length > 0;

  const handleCreate = () => {
    setCreating(true);
    setTimeout(() => {
      setCreating(false);
      toast.success(isZh ? "项目已创建！" : "Project created!");
      setLocation("/project-management");
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isZh ? "新项目向导" : "New Project Wizard"}</h1>
            <p className="text-sm text-muted-foreground">{isZh ? "M0→M1→M2 智能引导创建清洗设备项目" : "M0→M1→M2 guided project creation"}</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mt-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className={`w-8 h-0.5 ${i <= step ? "bg-indigo-500" : "bg-border"}`} />}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                i < step ? "bg-green-100 text-green-700" : i === step ? "bg-indigo-100 text-indigo-700" : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <CheckCircle className="w-3.5 h-3.5" /> : <span className="w-4 text-center">{i + 1}</span>}
                {isZh ? s.labelZh : s.labelEn}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex-1 p-6">
        {/* Step 0: M0 Requirements */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-500" />
                {isZh ? "M0 — 项目需求定义" : "M0 — Project Requirements"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{isZh ? "项目名称 *" : "Project Name *"}</label>
                <input
                  className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
                  value={form.projectName}
                  onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                  placeholder={isZh ? "例: CX200清洗设备" : "e.g. CX200 Cleaning Machine"}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{isZh ? "清洗类型" : "Cleaning Type"}</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
                    value={form.cleaningType}
                    onChange={(e) => setForm({ ...form, cleaningType: e.target.value as CleaningType })}
                  >
                    {CLEANING_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{isZh ? t.labelZh : t.labelEn}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{isZh ? "自动化等级" : "Automation Level"}</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
                    value={form.automation}
                    onChange={(e) => setForm({ ...form, automation: e.target.value as AutomationLevel })}
                  >
                    {AUTOMATION_LEVELS.map((a) => (
                      <option key={a.value} value={a.value}>{isZh ? a.labelZh : a.labelEn}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{isZh ? "年产量预估" : "Annual Volume"}</label>
                <input
                  className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
                  value={form.volume}
                  onChange={(e) => setForm({ ...form, volume: e.target.value })}
                  placeholder={isZh ? "例: 50,000 件/年" : "e.g. 50,000 pcs/year"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{isZh ? "补充描述" : "Description"}</label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background h-20 resize-none"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={isZh ? "清洗工件特征、特殊要求等..." : "Workpiece characteristics, special requirements..."}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(1)} disabled={!canProceedStep0} className="gap-1.5">
                  {isZh ? "下一步" : "Next"} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: M1 AI Suggestion + Quotation */}
        {step === 1 && suggestion && quotation && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-500" />
                  {isZh ? "M1 — AI 平台推荐" : "M1 — AI Platform Suggestion"}
                  <Badge variant="secondary" className="ml-2">{suggestion.confidence}% {isZh ? "匹配度" : "confidence"}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-indigo-600 mb-3">{suggestion.platform}</p>
                <div className="flex flex-wrap gap-2">
                  {suggestion.features.map((f, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      <Zap className="w-3 h-3" /> {f}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-500" />
                  {isZh ? "AI 报价估算" : "AI Quotation Estimate"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-lg font-bold">¥{(quotation.basePrice / 10000).toFixed(1)}万</p>
                    <p className="text-xs text-muted-foreground">{isZh ? "设备基价" : "Base Price"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-lg font-bold">¥{(quotation.installFee / 10000).toFixed(1)}万</p>
                    <p className="text-xs text-muted-foreground">{isZh ? "安装调试" : "Installation"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-lg font-bold">¥{(quotation.trainingFee / 10000).toFixed(1)}万</p>
                    <p className="text-xs text-muted-foreground">{isZh ? "培训费" : "Training"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-indigo-50 text-center">
                    <p className="text-xl font-bold text-indigo-600">¥{(quotation.total / 10000).toFixed(1)}万</p>
                    <p className="text-xs text-muted-foreground">{isZh ? "合计" : "Total"}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isZh ? `预计交付周期: ${quotation.deliveryWeeks} 周` : `Est. delivery: ${quotation.deliveryWeeks} weeks`}
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)} className="gap-1.5">
                <ArrowLeft className="w-4 h-4" /> {isZh ? "上一步" : "Back"}
              </Button>
              <Button onClick={() => setStep(2)} className="gap-1.5">
                {isZh ? "确认方案" : "Confirm"} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: M2 Summary + Create */}
        {step === 2 && suggestion && quotation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Factory className="w-4 h-4 text-green-500" />
                {isZh ? "M2 — 项目确认" : "M2 — Project Confirmation"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">{isZh ? "项目名称" : "Name"}:</span> <span className="font-medium">{form.projectName}</span></div>
                <div><span className="text-muted-foreground">{isZh ? "清洗类型" : "Type"}:</span> <span className="font-medium">{form.cleaningType}</span></div>
                <div><span className="text-muted-foreground">{isZh ? "自动化" : "Auto"}:</span> <span className="font-medium">{form.automation}</span></div>
                <div><span className="text-muted-foreground">{isZh ? "产量" : "Volume"}:</span> <span className="font-medium">{form.volume || "-"}</span></div>
                <div><span className="text-muted-foreground">{isZh ? "推荐平台" : "Platform"}:</span> <span className="font-medium text-indigo-600">{suggestion.platform}</span></div>
                <div><span className="text-muted-foreground">{isZh ? "总报价" : "Total"}:</span> <span className="font-bold text-indigo-600">¥{(quotation.total / 10000).toFixed(1)}万</span></div>
              </div>

              <Separator />

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> {isZh ? "上一步" : "Back"}
                </Button>
                <Button onClick={handleCreate} disabled={creating} className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {isZh ? "创建项目" : "Create Project"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
