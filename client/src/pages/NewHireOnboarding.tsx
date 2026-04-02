/**
 * 入职者自助填报 (New Hire Onboarding Form)
 *
 * Step-by-step 引导式表单：
 *  Step 1: 基本信息（姓名/性别/出生日期/手机号/邮箱/籍贯）
 *  Step 2: 证件信息（身份证号/学历/毕业院校/专业）
 *  Step 3: 银行卡 & 社保（开户行/卡号/社保号/公积金号）
 *  Step 4: 紧急联系人
 *  Step 5: 确认签署 & 提交
 *
 * 触控友好：大输入框、清晰分组、进度指示
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  User, CreditCard, Heart, Phone, Send,
  ChevronRight, ChevronLeft, CheckCircle2, FileText,
  Shield, Building2, GraduationCap, Landmark, AlertCircle,
} from "lucide-react";

const STEPS = [
  { key: "basic", labelZh: "基本信息", labelEn: "Basic Info", icon: User },
  { key: "id", labelZh: "证件学历", labelEn: "ID & Education", icon: CreditCard },
  { key: "bank", labelZh: "银行社保", labelEn: "Bank & Insurance", icon: Landmark },
  { key: "emergency", labelZh: "紧急联系人", labelEn: "Emergency Contact", icon: Phone },
  { key: "confirm", labelZh: "确认提交", labelEn: "Confirm", icon: Send },
];

interface FormData {
  // Step 1
  name: string; gender: string; birthDate: string; phone: string; email: string;
  nativePlace: string; currentAddress: string; maritalStatus: string;
  // Step 2
  idNumber: string; education: string; school: string; major: string;
  graduationDate: string; degree: string; certifications: string;
  // Step 3
  bankName: string; bankAccount: string; bankBranch: string;
  socialInsuranceId: string; housingFundId: string;
  // Step 4
  emergencyName: string; emergencyRelation: string; emergencyPhone: string;
  emergencyAddress: string;
}

const INITIAL: FormData = {
  name: "", gender: "", birthDate: "", phone: "", email: "",
  nativePlace: "", currentAddress: "", maritalStatus: "",
  idNumber: "", education: "", school: "", major: "",
  graduationDate: "", degree: "", certifications: "",
  bankName: "", bankAccount: "", bankBranch: "",
  socialInsuranceId: "", housingFundId: "",
  emergencyName: "", emergencyRelation: "", emergencyPhone: "",
  emergencyAddress: "",
};

export default function NewHireOnboarding() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({ ...INITIAL, name: user?.name || "" });
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (field: keyof FormData, value: string) => setForm({ ...form, [field]: value });

  const canGoNext = (): boolean => {
    if (step === 0) return !!form.name && !!form.phone;
    if (step === 1) return !!form.idNumber;
    if (step === 2) return !!form.bankName && !!form.bankAccount;
    if (step === 3) return !!form.emergencyName && !!form.emergencyPhone;
    if (step === 4) return agreed;
    return true;
  };

  const handleSubmit = () => {
    // In production, this would call a tRPC mutation
    toast({ title: isZh ? "入职资料已提交" : "Onboarding form submitted", description: isZh ? "HR将在1-2个工作日内审核" : "HR will review within 1-2 business days" });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
            <h2 className="text-xl font-bold mb-2">{isZh ? "入职资料已提交" : "Form Submitted"}</h2>
            <p className="text-muted-foreground mb-4">{isZh ? "HR将在1-2个工作日内审核您的资料" : "HR will review your information within 1-2 business days"}</p>
            <div className="text-xs text-muted-foreground space-y-1 mb-6">
              <p>{isZh ? "姓名" : "Name"}: {form.name}</p>
              <p>{isZh ? "手机" : "Phone"}: {form.phone}</p>
              <p>{isZh ? "身份证" : "ID"}: {form.idNumber ? `${form.idNumber.slice(0, 6)}****${form.idNumber.slice(-4)}` : "—"}</p>
            </div>
            <Badge variant="outline">{isZh ? "等待审核中" : "Under Review"}</Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24">
      {/* 标题 */}
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold">{isZh ? "入职资料填报" : "New Hire Onboarding"}</h1>
        <p className="text-sm text-muted-foreground">{isZh ? "请如实填写以下信息，用于办理入职手续" : "Please fill in accurately for onboarding processing"}</p>
      </header>

      {/* 步骤指示器 */}
      <div className="flex items-center justify-center gap-1 mb-6 flex-wrap">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={s.key} className="flex items-center gap-1">
              <button
                onClick={() => i <= step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-green-100 text-green-700 dark:bg-green-950/30" : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                <span className="hidden sm:inline">{isZh ? s.labelZh : s.labelEn}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Step 0: 基本信息 */}
        {step === 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" />{isZh ? "基本信息" : "Basic Information"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FieldRow>
                <Field label={isZh ? "姓名 *" : "Name *"} value={form.name} onChange={(v) => set("name", v)} />
                <Field label={isZh ? "性别" : "Gender"} value={form.gender} onChange={(v) => set("gender", v)} placeholder={isZh ? "男/女" : "M/F"} />
              </FieldRow>
              <FieldRow>
                <Field label={isZh ? "出生日期" : "Birth Date"} value={form.birthDate} onChange={(v) => set("birthDate", v)} type="date" />
                <Field label={isZh ? "手机号 *" : "Phone *"} value={form.phone} onChange={(v) => set("phone", v)} placeholder="13800138000" />
              </FieldRow>
              <FieldRow>
                <Field label={isZh ? "邮箱" : "Email"} value={form.email} onChange={(v) => set("email", v)} type="email" />
                <Field label={isZh ? "婚姻状况" : "Marital Status"} value={form.maritalStatus} onChange={(v) => set("maritalStatus", v)} placeholder={isZh ? "未婚/已婚" : "Single/Married"} />
              </FieldRow>
              <Field label={isZh ? "籍贯" : "Native Place"} value={form.nativePlace} onChange={(v) => set("nativePlace", v)} placeholder={isZh ? "省/市" : "Province/City"} />
              <Field label={isZh ? "现居住地址" : "Current Address"} value={form.currentAddress} onChange={(v) => set("currentAddress", v)} placeholder={isZh ? "详细地址" : "Full address"} />
            </CardContent>
          </Card>
        )}

        {/* Step 1: 证件学历 */}
        {step === 1 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><GraduationCap className="w-4 h-4" />{isZh ? "证件与学历" : "ID & Education"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label={isZh ? "身份证号 *" : "ID Number *"} value={form.idNumber} onChange={(v) => set("idNumber", v)} placeholder="110101199001011234" />
              <FieldRow>
                <Field label={isZh ? "最高学历" : "Education"} value={form.education} onChange={(v) => set("education", v)} placeholder={isZh ? "本科/硕士/博士" : "Bachelor/Master/PhD"} />
                <Field label={isZh ? "学位" : "Degree"} value={form.degree} onChange={(v) => set("degree", v)} placeholder={isZh ? "工学学士" : "B.Eng"} />
              </FieldRow>
              <FieldRow>
                <Field label={isZh ? "毕业院校" : "School"} value={form.school} onChange={(v) => set("school", v)} />
                <Field label={isZh ? "专业" : "Major"} value={form.major} onChange={(v) => set("major", v)} />
              </FieldRow>
              <Field label={isZh ? "毕业日期" : "Graduation Date"} value={form.graduationDate} onChange={(v) => set("graduationDate", v)} type="date" />
              <Field label={isZh ? "资格证书（多个用逗号分隔）" : "Certifications (comma separated)"} value={form.certifications} onChange={(v) => set("certifications", v)} placeholder={isZh ? "如: CET-6, PMP, 焊接工程师" : "e.g. CET-6, PMP"} />
            </CardContent>
          </Card>
        )}

        {/* Step 2: 银行社保 */}
        {step === 2 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Landmark className="w-4 h-4" />{isZh ? "银行卡与社保" : "Bank & Insurance"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label={isZh ? "开户银行 *" : "Bank Name *"} value={form.bankName} onChange={(v) => set("bankName", v)} placeholder={isZh ? "如: 中国工商银行" : "e.g. ICBC"} />
              <Field label={isZh ? "银行卡号 *" : "Account Number *"} value={form.bankAccount} onChange={(v) => set("bankAccount", v)} placeholder="6222 0000 0000 0000" />
              <Field label={isZh ? "开户支行" : "Branch"} value={form.bankBranch} onChange={(v) => set("bankBranch", v)} placeholder={isZh ? "如: 苏州工业园区支行" : "e.g. SIP Branch"} />
              <Separator />
              <FieldRow>
                <Field label={isZh ? "社保编号（如已有）" : "Social Insurance ID"} value={form.socialInsuranceId} onChange={(v) => set("socialInsuranceId", v)} />
                <Field label={isZh ? "公积金号（如已有）" : "Housing Fund ID"} value={form.housingFundId} onChange={(v) => set("housingFundId", v)} />
              </FieldRow>
              <div className="p-3 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 text-xs text-blue-700">
                <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                {isZh ? "如无社保/公积金号，公司将为您统一办理，请留空" : "Leave blank if none — company will register for you"}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: 紧急联系人 */}
        {step === 3 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Heart className="w-4 h-4 text-red-500" />{isZh ? "紧急联系人" : "Emergency Contact"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FieldRow>
                <Field label={isZh ? "联系人姓名 *" : "Contact Name *"} value={form.emergencyName} onChange={(v) => set("emergencyName", v)} />
                <Field label={isZh ? "与本人关系" : "Relationship"} value={form.emergencyRelation} onChange={(v) => set("emergencyRelation", v)} placeholder={isZh ? "如: 父亲/母亲/配偶" : "e.g. Father/Spouse"} />
              </FieldRow>
              <Field label={isZh ? "联系电话 *" : "Phone *"} value={form.emergencyPhone} onChange={(v) => set("emergencyPhone", v)} placeholder="13800138000" />
              <Field label={isZh ? "联系地址" : "Address"} value={form.emergencyAddress} onChange={(v) => set("emergencyAddress", v)} />
            </CardContent>
          </Card>
        )}

        {/* Step 4: 确认签署 */}
        {step === 4 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" />{isZh ? "确认信息并签署" : "Confirm & Sign"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <SummaryField label={isZh ? "姓名" : "Name"} value={form.name} />
                <SummaryField label={isZh ? "手机" : "Phone"} value={form.phone} />
                <SummaryField label={isZh ? "身份证" : "ID"} value={form.idNumber ? `${form.idNumber.slice(0, 6)}****${form.idNumber.slice(-4)}` : "—"} />
                <SummaryField label={isZh ? "学历" : "Education"} value={`${form.education} · ${form.school}`} />
                <SummaryField label={isZh ? "银行" : "Bank"} value={`${form.bankName} ****${form.bankAccount.slice(-4)}`} />
                <SummaryField label={isZh ? "紧急联系人" : "Emergency"} value={`${form.emergencyName} (${form.emergencyRelation})`} />
              </div>

              <Separator />

              <div className="p-4 rounded bg-muted/50 border text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">{isZh ? "入职须知" : "Onboarding Notice"}</p>
                <p>• {isZh ? "本人确认以上信息真实有效，如有虚假愿承担相应责任" : "I confirm all information is true and accurate"}</p>
                <p>• {isZh ? "同意公司依法收集和使用本人个人信息用于劳动关系管理" : "I agree to company's lawful collection of personal data for HR management"}</p>
                <p>• {isZh ? "了解公司保密制度和员工手册相关规定" : "I acknowledge confidentiality policies and employee handbook"}</p>
              </div>

              <label className="flex items-center gap-3 p-3 rounded border cursor-pointer hover:bg-muted/30 transition-colors touch-feedback">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-5 h-5" />
                <span className="text-sm font-medium">{isZh ? "我已阅读并同意以上条款" : "I have read and agree to the terms above"}</span>
              </label>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 底部导航 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-between max-w-2xl mx-auto safe-area-pb z-40">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          <ChevronLeft className="w-4 h-4 mr-1" />{isZh ? "上一步" : "Back"}
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canGoNext()}>
            {isZh ? "下一步" : "Next"}<ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!agreed}>
            <Send className="w-4 h-4 mr-1" />{isZh ? "提交入职资料" : "Submit"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="flex-1">
      <label className="text-xs font-medium mb-1 block">{label}</label>
      <Input className="h-11" type={type || "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-3">{children}</div>;
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium truncate">{value || "—"}</p>
    </div>
  );
}
