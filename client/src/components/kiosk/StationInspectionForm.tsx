import { useState } from "react";
import { Check, X, Camera, Loader2, ChevronLeft, AlertCircle } from "lucide-react";
import { useKioskSessionContext } from "@/hooks/useKioskSession";

interface StationInspectionFormProps {
  projectId: string;
  processCode: string;
  processName: string;
  checkpointId?: number;
  onComplete: () => void;
  onBack: () => void;
}

const DEFECT_TYPES = [
  { value: "dimensional", label: "尺寸" },
  { value: "surface", label: "表面" },
  { value: "functional", label: "功能" },
  { value: "assembly", label: "装配" },
  { value: "material", label: "材料" },
  { value: "cleanliness", label: "清洁" },
];

const DEFECT_CODES = [
  { value: "D001", label: "D001 - 尺寸超差" },
  { value: "D002", label: "D002 - 表面划伤" },
  { value: "D003", label: "D003 - 表面凹坑" },
  { value: "D010", label: "D010 - 功能异常" },
  { value: "D020", label: "D020 - 装配松动" },
  { value: "D021", label: "D021 - 装配错位" },
  { value: "D030", label: "D030 - 材料缺陷" },
  { value: "D040", label: "D040 - 清洁度不达标" },
  { value: "D099", label: "D099 - 其他缺陷" },
];

type InspectionResult = "pass" | "fail" | null;

export default function StationInspectionForm({
  projectId,
  processCode,
  processName,
  checkpointId,
  onComplete,
  onBack,
}: StationInspectionFormProps) {
  const session = useKioskSessionContext();
  const [result, setResult] = useState<InspectionResult>(null);
  const [defectType, setDefectType] = useState<string>("");
  const [defectCode, setDefectCode] = useState<string>("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Poka-yoke validation
  const validate = (): boolean => {
    if (!result) {
      setValidationErrors(["请选择检验结果"]);
      return false;
    }
    if (result === "fail") {
      const errors: string[] = [];
      if (!defectType) errors.push("缺陷类型为必填项");
      if (!defectCode && remark.length < 10) {
        errors.push("请选择缺陷代码或填写至少10字的备注");
      }
      if (errors.length > 0) {
        setValidationErrors(errors);
        return false;
      }
    }
    setValidationErrors([]);
    return true;
  };

  const canSubmit = (): boolean => {
    if (!result) return false;
    if (result === "pass") return true;
    // Fail requires defectType AND (defectCode OR remark >= 10 chars)
    return !!defectType && (!!defectCode || remark.length >= 10);
  };

  const handleSubmit = async () => {
    if (!validate() || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        projectId,
        processCode,
        checkpointId: checkpointId || 0,
        result: result!,
        defectType: result === "fail" ? defectType : undefined,
        defectCode: result === "fail" ? defectCode : undefined,
        remark: remark || undefined,
        // IATF 16949 §8.5.2 traceability fields (silent injection)
        operatorId: session.operator!.id,
        stationId: session.stationId,
        clientTimestamp: new Date().toISOString(),
      };

      const res = await fetch("/api/trpc/kiosk.submitInspection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      const data = json?.result?.data;

      if (data?.success) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onComplete();
        }, 1000);
      } else {
        setValidationErrors(["提交失败，请重试"]);
      }
    } catch (err) {
      console.error("[Kiosk] submitInspection failed:", err);
      setValidationErrors(["网络错误，请重试"]);
    }
    setSubmitting(false);
  };

  // Success animation
  if (showSuccess) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center animate-in fade-in zoom-in duration-300">
          <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <Check className="w-12 h-12 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-green-400">提交成功</h2>
          <p className="text-muted-foreground mt-1">即将加载下一个任务...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-accent active:bg-accent/80 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold">工位检验</h2>
            <p className="text-sm text-muted-foreground">
              {projectId} · {processName || processCode}
            </p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Pass/Fail Selection */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => { setResult("pass"); setValidationErrors([]); }}
            className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all min-h-[120px] ${
              result === "pass"
                ? "border-green-500 bg-green-500/10 text-green-400 ring-2 ring-green-500/30"
                : "border-border hover:border-green-500/50 hover:bg-green-500/5"
            }`}
          >
            <Check className="w-10 h-10 mb-2" />
            <span className="text-xl font-bold">合格</span>
            <span className="text-sm text-muted-foreground mt-1">Pass</span>
          </button>

          <button
            onClick={() => { setResult("fail"); setValidationErrors([]); }}
            className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all min-h-[120px] ${
              result === "fail"
                ? "border-red-500 bg-red-500/10 text-red-400 ring-2 ring-red-500/30"
                : "border-border hover:border-red-500/50 hover:bg-red-500/5"
            }`}
          >
            <X className="w-10 h-10 mb-2" />
            <span className="text-xl font-bold">不合格</span>
            <span className="text-sm text-muted-foreground mt-1">Fail</span>
          </button>
        </div>

        {/* Fail-specific mandatory fields (Poka-yoke) */}
        {result === "fail" && (
          <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
            {/* Defect Type — required */}
            <div>
              <label className="block text-sm font-medium mb-2">
                缺陷类型 <span className="text-red-400">*必填</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {DEFECT_TYPES.map((dt) => (
                  <button
                    key={dt.value}
                    onClick={() => { setDefectType(dt.value); setValidationErrors([]); }}
                    className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all min-h-[48px] ${
                      defectType === dt.value
                        ? "border-red-500 bg-red-500/10 text-red-400"
                        : `border-border hover:border-red-500/50 ${!defectType ? "border-red-500/30" : ""}`
                    }`}
                  >
                    {dt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Defect Code — required unless remark >= 10 chars */}
            <div>
              <label className="block text-sm font-medium mb-2">
                缺陷代码 <span className="text-red-400">*必填</span>
              </label>
              <select
                value={defectCode}
                onChange={(e) => { setDefectCode(e.target.value); setValidationErrors([]); }}
                className={`w-full h-12 px-4 text-base bg-background border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                  !defectCode && remark.length < 10 ? "border-red-500/30" : "border-border"
                }`}
              >
                <option value="">选择缺陷代码...</option>
                {DEFECT_CODES.map((dc) => (
                  <option key={dc.value} value={dc.value}>{dc.label}</option>
                ))}
              </select>
            </div>

            {/* Remark — required if no defect code, min 10 chars for fail */}
            <div>
              <label className="block text-sm font-medium mb-2">
                备注 {!defectCode && <span className="text-red-400">*至少10字</span>}
              </label>
              <textarea
                value={remark}
                onChange={(e) => { setRemark(e.target.value); setValidationErrors([]); }}
                placeholder="描述缺陷详情（不合格时至少10个字符）"
                rows={3}
                className={`w-full px-4 py-3 text-base bg-background border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none ${
                  !defectCode && remark.length < 10 ? "border-red-500/30" : "border-border"
                }`}
              />
              {result === "fail" && remark.length > 0 && remark.length < 10 && (
                <p className="text-xs text-red-400 mt-1">{remark.length}/10 字符</p>
              )}
            </div>
          </div>
        )}

        {/* Pass remark (optional) */}
        {result === "pass" && (
          <div>
            <label className="block text-sm font-medium mb-2">备注（可选）</label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="补充说明..."
              rows={2}
              className="w-full px-4 py-3 text-base bg-background border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        )}

        {/* Photo attachment button */}
        {result && (
          <button className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border hover:bg-accent transition-colors min-h-[48px]">
            <Camera className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">拍照附件</span>
          </button>
        )}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-1">
            {validationErrors.map((err, i) => (
              <div key={i} className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex-shrink-0 p-4 border-t border-border">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit() || submitting}
          className="w-full h-14 text-lg font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-h-[48px]"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              提交中...
            </>
          ) : (
            "提交"
          )}
        </button>
      </div>
    </div>
  );
}
