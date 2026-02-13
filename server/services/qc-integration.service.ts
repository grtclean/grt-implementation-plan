/**
 * QC Integration Service
 * Quality control inspection workflow, checklists, statistics, and notifications.
 */

export interface ChecklistItem {
  itemCode: string;
  itemName: string;
  standard: string;
  actualValue: string;
  result: "Pass" | "Fail" | "NA";
}

export interface QCInspection {
  id: number;
  inspectionCode: string;
  taskId: number;
  workOrderId: number;
  inspectionType: string;
  inspectorId: number;
  inspectorName: string;
  inspectionTime: string;
  result: string;
  defectType?: string;
  reworkRequired: boolean;
  qualityScore: number;
}

export interface QCStatistics {
  totalInspections: number;
  passCount: number;
  failCount: number;
  passRate: number;
  averageQualityScore: number;
  commonDefects: { defectType: string; count: number }[];
}

export interface QCWorkflowStatus {
  taskId: number;
  currentQCStatus: string;
  reworkCount: number;
}

export interface ChecklistValidation {
  isValid: boolean;
  missingItems: string[];
}

export interface QCNotification {
  level: "info" | "warning" | "error";
  message: string;
}

export function generateInspectionCode(inspectionType: string): string {
  const prefix = getInspectionTypePrefix(inspectionType);
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `QC-${prefix}-${ts}-${rand}`;
}

export function getInspectionTypePrefix(inspectionType: string): string {
  const map: Record<string, string> = {
    First_Article: "FA",
    In_Process: "IP",
    Final: "FI",
    Rework: "RW",
  };
  return map[inspectionType] ?? "XX";
}

export function determineTaskStatusFromQC(qcResult: string, inspectionType: string): string {
  if (qcResult === "Pass" && inspectionType === "Final") return "Completed";
  if (qcResult === "Fail") return "On_Hold";
  return "In_Progress";
}

export function requiresRework(qcResult: string, defectType?: string): boolean {
  if (qcResult === "Fail") return true;
  if (qcResult === "Conditional_Pass" && defectType) {
    const reworkDefects = ["dimensional_error", "structural_defect", "assembly_error"];
    return reworkDefects.includes(defectType);
  }
  return false;
}

export function calculateQualityScore(items: ChecklistItem[]): number {
  if (items.length === 0) return 0;
  const applicable = items.filter((item) => item.result !== "NA");
  if (applicable.length === 0) return 100;
  const passCount = applicable.filter((item) => item.result === "Pass").length;
  return Math.round((passCount / applicable.length) * 100);
}

export function validateChecklist(items: ChecklistItem[]): ChecklistValidation {
  const missingItems = items
    .filter((item) => !item.actualValue || item.actualValue.trim() === "")
    .map((item) => item.itemName);
  return {
    isValid: missingItems.length === 0,
    missingItems,
  };
}

export function calculateQCStatistics(inspections: QCInspection[]): QCStatistics {
  const passCount = inspections.filter((i) => i.result === "Pass").length;
  const failCount = inspections.filter((i) => i.result === "Fail").length;
  const totalScores = inspections.reduce((s, i) => s + i.qualityScore, 0);

  const defectCounts: Record<string, number> = {};
  for (const insp of inspections) {
    if (insp.defectType) {
      defectCounts[insp.defectType] = (defectCounts[insp.defectType] || 0) + 1;
    }
  }
  const commonDefects = Object.entries(defectCounts).map(([defectType, count]) => ({
    defectType,
    count,
  }));

  return {
    totalInspections: inspections.length,
    passCount,
    failCount,
    passRate: inspections.length > 0 ? Math.round((passCount / inspections.length) * 100) : 0,
    averageQualityScore:
      inspections.length > 0 ? Math.round(totalScores / inspections.length) : 0,
    commonDefects,
  };
}

export function getQCWorkflowStatus(
  inspections: QCInspection[],
  taskId: number,
  workOrderId: number
): QCWorkflowStatus {
  const taskInspections = inspections.filter(
    (i) => i.taskId === taskId && i.workOrderId === workOrderId
  );
  const lastInspection = taskInspections[taskInspections.length - 1];
  const reworkCount = taskInspections.filter((i) => i.reworkRequired).length;
  return {
    taskId,
    currentQCStatus: lastInspection?.result ?? "Pending",
    reworkCount,
  };
}

export function createDefaultChecklist(taskType: string): ChecklistItem[] {
  if (taskType === "Elec_Assy") {
    return [
      { itemCode: "EA-001", itemName: "接线正确性", standard: "按图纸", actualValue: "", result: "NA" },
      { itemCode: "EA-002", itemName: "绝缘测试", standard: ">500MR", actualValue: "", result: "NA" },
      { itemCode: "EA-003", itemName: "功能测试", standard: "正常运行", actualValue: "", result: "NA" },
      { itemCode: "EA-004", itemName: "标签粘贴", standard: "完整清晰", actualValue: "", result: "NA" },
    ];
  }
  // Default for Mech_Sub_Assy and others
  return [
    { itemCode: "MS-001", itemName: "尺寸检测", standard: "公差内", actualValue: "", result: "NA" },
    { itemCode: "MS-002", itemName: "外观检查", standard: "无划伤", actualValue: "", result: "NA" },
    { itemCode: "MS-003", itemName: "装配间隙", standard: "<0.5mm", actualValue: "", result: "NA" },
    { itemCode: "MS-004", itemName: "紧固力矩", standard: "按标准", actualValue: "", result: "NA" },
  ];
}

export function formatQCResultForNotification(inspection: QCInspection): QCNotification {
  if (inspection.result === "Fail") {
    const defectMsg = inspection.defectType ? `缺陷类型: ${inspection.defectType}` : "";
    const reworkMsg = inspection.reworkRequired ? "，需要返工" : "";
    return {
      level: "error",
      message: `质检未通过 [${inspection.inspectionCode}] ${defectMsg}${reworkMsg}`,
    };
  }
  return {
    level: "info",
    message: `质检通过 [${inspection.inspectionCode}] 质量评分: ${inspection.qualityScore}`,
  };
}

export function createQCIntegrationService() {
  return {
    generateInspectionCode,
    getInspectionTypePrefix,
    determineTaskStatusFromQC,
    requiresRework,
    calculateQualityScore,
    validateChecklist,
    calculateQCStatistics,
    getQCWorkflowStatus,
    createDefaultChecklist,
    formatQCResultForNotification,
  };
}
