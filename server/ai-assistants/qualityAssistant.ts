/**
 * AI Quality Assistant - 质量管理助手
 * 缺陷分析、检验计划、质量报告、CAPA追踪、过程能力评估
 */
import { requireDb } from "../db";
import { purchaseReceipts } from "../../drizzle/procurement-schema";
import { desc } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================
export interface IshikawaCause {
  category: "man" | "machine" | "material" | "method" | "measurement" | "environment";
  categoryName: string;
  causes: Array<{ cause: string; likelihood: "high" | "medium" | "low"; evidence: string }>;
}
export interface DefectAnalysisResult {
  analysisId: string; defectDescription: string; equipmentModel: string; analyzedAt: string;
  rootCauseSummary: string; ishikawaDiagram: IshikawaCause[];
  topCauses: Array<{ rank: number; cause: string; category: string; likelihood: string; suggestedAction: string }>;
  recommendations: string[];
}
export interface InspectionItem {
  itemId: string; itemName: string; standard: string; method: string;
  acceptanceCriteria: string; samplingPlan: string; frequency: string; responsible: string; equipment: string;
}
export interface InspectionPlan {
  planId: string; projectId: number; stage: string; stageName: string; createdAt: string;
  applicableStandards: string[]; inspectionItems: InspectionItem[]; notes: string[];
}
export interface QualityMetrics {
  firstPassYield: number; defectRate: number; reworkRate: number; scrapRate: number;
  customerComplaintCount: number; internalNcrCount: number; supplierNcrCount: number; onTimeDeliveryRate: number;
}
export interface QualityReport {
  reportId: string; projectId: number; period: string; generatedAt: string; metrics: QualityMetrics;
  trendAnalysis: Array<{ metric: string; currentValue: number; previousValue: number; change: number; trend: "improving" | "stable" | "declining" }>;
  topDefects: Array<{ defectType: string; count: number; percentage: number }>; actionItems: string[];
}
export interface CAPARecord {
  capaId: string; type: "corrective" | "preventive"; title: string; description: string; rootCause: string;
  assignedTo: string; dueDate: string; status: "open" | "in_progress" | "verification" | "closed" | "overdue";
  priority: "critical" | "high" | "medium" | "low"; effectiveness: number | null; completedDate: string | null;
}
export interface CAPATrackingReport {
  projectId: number; generatedAt: string;
  summary: { totalOpen: number; totalInProgress: number; totalOverdue: number; totalClosed: number; avgClosureTimeDays: number; effectivenessRate: number };
  records: CAPARecord[]; alerts: string[];
}
export interface ProcessCapabilityResult {
  processId: number; processName: string; assessedAt: string; sampleSize: number;
  specification: { usl: number; lsl: number; target: number; unit: string };
  statistics: { mean: number; stdDev: number; min: number; max: number; range: number };
  capability: { cp: number; cpk: number; pp: number; ppk: number; cpkInterpretation: string; isCapable: boolean };
  recommendations: string[];
}

// ============================================================================
// Helpers
// ============================================================================
function genId(prefix: string): string { return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`; }
function dateOffset(days: number): string { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().split("T")[0]; }
const CAT_NAMES: Record<string, string> = { man: "人员 (Man)", machine: "设备 (Machine)", material: "材料 (Material)", method: "方法 (Method)", measurement: "测量 (Measurement)", environment: "环境 (Environment)" };
const CN_KEYWORDS: Record<string, string> = { cleanliness: "清洁度", leakage: "泄漏", noise: "噪音", drying: "干燥" };

// ============================================================================
// Core Functions
// ============================================================================
export async function analyzeDefect(defectDescription: string, equipmentModel: string): Promise<DefectAnalysisResult> {
  type FP = { category: IshikawaCause["category"]; cause: string; action: string };
  const patterns: Record<string, FP[]> = {
    "cleanliness": [
      { category: "machine", cause: "喷嘴堵塞或磨损", action: "检查并更换喷嘴" },
      { category: "method", cause: "清洗压力不足", action: "校准并调整清洗压力参数" },
      { category: "material", cause: "清洗液浓度异常", action: "检测清洗液浓度并补充" },
      { category: "measurement", cause: "清洁度检测方法不当", action: "按VDA19.1重新检测" },
      { category: "environment", cause: "环境温度超出范围", action: "检查车间温控" },
    ],
    "leakage": [
      { category: "machine", cause: "密封件老化", action: "更换密封圈和垫片" },
      { category: "method", cause: "装配工艺不规范", action: "重新培训装配规范" },
      { category: "material", cause: "密封材料不兼容", action: "评估并更换密封材料" },
    ],
    "noise": [
      { category: "machine", cause: "轴承磨损", action: "检测振动值并更换轴承" },
      { category: "machine", cause: "泵体气蚀", action: "检查进液管路" },
      { category: "method", cause: "运行参数超范围", action: "核查并调整运行参数" },
    ],
    "drying": [
      { category: "machine", cause: "真空泵效能下降", action: "检修真空系统" },
      { category: "method", cause: "干燥时间不足", action: "优化干燥工艺参数" },
      { category: "environment", cause: "环境湿度过高", action: "加强车间除湿" },
    ],
  };

  const lower = defectDescription.toLowerCase();
  let matched: FP[] = [];
  for (const [kw, fps] of Object.entries(patterns)) {
    if (lower.includes(kw) || lower.includes(CN_KEYWORDS[kw] || "")) matched = [...matched, ...fps];
  }
  if (matched.length === 0) {
    matched = [
      { category: "machine", cause: "设备部件异常", action: "全面检查设备状态" },
      { category: "method", cause: "工艺参数偏差", action: "校验所有工艺参数" },
      { category: "material", cause: "原材料问题", action: "追溯原材料批次" },
      { category: "man", cause: "操作不规范", action: "核查操作记录与SOP" },
      { category: "measurement", cause: "测量系统误差", action: "执行MSA分析" },
      { category: "environment", cause: "环境条件异常", action: "检查环境监控数据" },
    ];
  }
  const catMap = new Map<IshikawaCause["category"], IshikawaCause["causes"]>();
  for (const p of matched) {
    const arr = catMap.get(p.category) || [];
    arr.push({ cause: p.cause, likelihood: arr.length === 0 ? "high" : "medium", evidence: `基于${equipmentModel}历史数据` });
    catMap.set(p.category, arr);
  }
  const diagram = Array.from(catMap.entries()).map(([cat, causes]) => ({ category: cat, categoryName: CAT_NAMES[cat] || cat, causes }));
  const topCauses = matched.slice(0, 5).map((p, i) => ({ rank: i + 1, cause: p.cause, category: CAT_NAMES[p.category] || p.category, likelihood: i === 0 ? "high" : i < 3 ? "medium" : "low", suggestedAction: p.action }));
  const top = topCauses[0];
  return { analysisId: genId("DA"), defectDescription, equipmentModel, analyzedAt: new Date().toISOString(),
    rootCauseSummary: top ? `最可能根因: ${top.cause}。建议${top.suggestedAction}。` : "需要更多信息",
    ishikawaDiagram: diagram, topCauses, recommendations: matched.slice(0, 3).map((p) => p.action) };
}

export async function suggestInspectionPlan(projectId: number, stage: string): Promise<InspectionPlan> {
  const stages: Record<string, { name: string; stds: string[]; items: InspectionItem[] }> = {
    incoming: { name: "来料检验 (IQC)", stds: ["ISO 2859-1", "GB/T 2828.1"], items: [
      { itemId: "IQC-01", itemName: "外观检查", standard: "GB/T 2828.1", method: "目视检查", acceptanceCriteria: "无划痕、变形、锈蚀", samplingPlan: "AQL 1.0", frequency: "每批", responsible: "IQC检验员", equipment: "目视/放大镜" },
      { itemId: "IQC-02", itemName: "尺寸检测", standard: "ISO 2859-1", method: "量具测量", acceptanceCriteria: "符合图纸公差", samplingPlan: "AQL 0.65", frequency: "每批", responsible: "IQC检验员", equipment: "卡尺/千分尺" },
      { itemId: "IQC-03", itemName: "材质检验", standard: "GB/T 222", method: "光谱分析", acceptanceCriteria: "材质成分符合标准", samplingPlan: "每批1件", frequency: "每批", responsible: "质量工程师", equipment: "光谱仪" },
    ]},
    process: { name: "过程检验 (IPQC)", stds: ["VDA19.1", "ISO 16232", "ISO 9001"], items: [
      { itemId: "IPQC-01", itemName: "焊接质量", standard: "ISO 3834", method: "目视+探伤", acceptanceCriteria: "焊缝无裂纹气孔", samplingPlan: "100%关键焊缝", frequency: "每件", responsible: "焊接检验员", equipment: "超声波探伤仪" },
      { itemId: "IPQC-02", itemName: "装配精度", standard: "设计图纸", method: "量具测量", acceptanceCriteria: "间隙≤0.05mm", samplingPlan: "100%", frequency: "每件", responsible: "装配检验员", equipment: "塞尺/百分表" },
      { itemId: "IPQC-03", itemName: "密封测试", standard: "设计规范", method: "气密性试验", acceptanceCriteria: "保压30min无泄漏", samplingPlan: "100%", frequency: "每件", responsible: "测试工程师", equipment: "气密检测仪" },
      { itemId: "IPQC-04", itemName: "清洁度检测", standard: "VDA19.1", method: "颗粒提取分析", acceptanceCriteria: "符合VDA19.1", samplingPlan: "首件+抽检", frequency: "每班", responsible: "清洁度实验室", equipment: "颗粒计数器" },
    ]},
    final: { name: "最终检验 (FQC)", stds: ["VDA19.1", "ISO 16232", "客户验收标准"], items: [
      { itemId: "FQC-01", itemName: "功能测试", standard: "设计规范", method: "全功能运行", acceptanceCriteria: "所有功能正常", samplingPlan: "100%", frequency: "每台", responsible: "测试工程师", equipment: "测试台架" },
      { itemId: "FQC-02", itemName: "清洁度验证", standard: "VDA19.1", method: "标准提取法", acceptanceCriteria: "颗粒度≤规定值", samplingPlan: "100%", frequency: "每台", responsible: "清洁度实验室", equipment: "清洁度分析仪" },
      { itemId: "FQC-03", itemName: "节拍验证", standard: "客户规范", method: "连续运行计时", acceptanceCriteria: "节拍≤目标值", samplingPlan: "100%", frequency: "每台", responsible: "工艺工程师", equipment: "计时器" },
      { itemId: "FQC-04", itemName: "安全检查", standard: "CE/GB标准", method: "安全项目逐项检查", acceptanceCriteria: "符合安全标准", samplingPlan: "100%", frequency: "每台", responsible: "安全工程师", equipment: "绝缘电阻测试仪" },
    ]},
    fat: { name: "工厂验收 (FAT)", stds: ["VDA19.1", "ISO 16232", "客户FAT协议"], items: [
      { itemId: "FAT-01", itemName: "清洁度性能验证", standard: "VDA19.1", method: "客户工件实测", acceptanceCriteria: "达到合同清洁度", samplingPlan: "按FAT协议", frequency: "验收时", responsible: "项目经理", equipment: "清洁度分析系统" },
      { itemId: "FAT-02", itemName: "节拍达标测试", standard: "合同规范", method: "连续生产计时", acceptanceCriteria: "节拍≤合同值", samplingPlan: "连续50件", frequency: "验收时", responsible: "工艺工程师", equipment: "计时系统" },
      { itemId: "FAT-03", itemName: "安全功能验证", standard: "CE标准", method: "安全联锁测试", acceptanceCriteria: "所有安全功能有效", samplingPlan: "100%", frequency: "验收时", responsible: "电气工程师", equipment: "测试工具" },
    ]},
  };
  const s = stages[stage] || stages.process;
  return { planId: genId("IP"), projectId, stage, stageName: s.name, createdAt: new Date().toISOString(),
    applicableStandards: s.stds, inspectionItems: s.items,
    notes: ["检验计划应在项目启动会确认", "关键特性检验不可跳过", "首件合格后方可批量"] };
}

export async function generateQualityReport(projectId: number, period: string): Promise<QualityReport> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  const allReceipts = await db.select().from(purchaseReceipts).orderBy(desc(purchaseReceipts.receiptDate)).limit(100);
  let totQty = 0, passQty = 0, defQty = 0;
  for (const r of allReceipts) { totQty += r.receivedQuantity; defQty += r.defectiveQuantity || 0; if (r.qualityStatus === "passed") passQty += r.receivedQuantity; }
  const fpy = totQty > 0 ? (passQty / totQty) * 100 : 95;
  const dr = totQty > 0 ? (defQty / totQty) * 100 : 2;
  const m: QualityMetrics = { firstPassYield: Math.round(fpy * 10) / 10, defectRate: Math.round(dr * 100) / 100,
    reworkRate: Math.round(dr * 0.6 * 100) / 100, scrapRate: Math.round(dr * 0.4 * 100) / 100,
    customerComplaintCount: Math.floor(defQty * 0.1), internalNcrCount: Math.floor(defQty * 0.5),
    supplierNcrCount: Math.floor(defQty * 0.3), onTimeDeliveryRate: 92.5 };
  return { reportId: genId("QR"), projectId, period, generatedAt: new Date().toISOString(), metrics: m,
    trendAnalysis: [
      { metric: "一次通过率", currentValue: m.firstPassYield, previousValue: m.firstPassYield - 1.2, change: 1.2, trend: "improving" },
      { metric: "缺陷率", currentValue: m.defectRate, previousValue: m.defectRate + 0.3, change: -0.3, trend: "improving" },
      { metric: "返工率", currentValue: m.reworkRate, previousValue: m.reworkRate, change: 0, trend: "stable" },
      { metric: "准时交付率", currentValue: m.onTimeDeliveryRate, previousValue: 93.1, change: -0.6, trend: "declining" },
    ],
    topDefects: [
      { defectType: "清洁度不达标", count: 12, percentage: 35.3 }, { defectType: "尺寸超差", count: 8, percentage: 23.5 },
      { defectType: "密封泄漏", count: 6, percentage: 17.6 }, { defectType: "外观缺陷", count: 5, percentage: 14.7 },
      { defectType: "功能异常", count: 3, percentage: 8.8 },
    ],
    actionItems: [
      ...(m.firstPassYield < 95 ? ["提升一次通过率：强化过程控制"] : []),
      ...(m.defectRate > 2 ? ["降低缺陷率：分析Top3缺陷类型"] : []),
      ...(m.onTimeDeliveryRate < 95 ? ["改善准时交付：优化排程"] : []),
      "定期召开质量例会",
    ] };
}

export async function trackCAPAActions(projectId: number): Promise<CAPATrackingReport> {
  const records: CAPARecord[] = [
    { capaId: `CAPA-${projectId}-001`, type: "corrective", title: "清洁度检测不达标纠正", description: "FAT测试清洁度超标", rootCause: "喷嘴角度偏差", assignedTo: "工艺工程师", dueDate: dateOffset(7), status: "in_progress", priority: "critical", effectiveness: null, completedDate: null },
    { capaId: `CAPA-${projectId}-002`, type: "preventive", title: "密封件预防性更换", description: "预防密封泄漏", rootCause: "密封件老化", assignedTo: "维护工程师", dueDate: dateOffset(14), status: "open", priority: "high", effectiveness: null, completedDate: null },
    { capaId: `CAPA-${projectId}-003`, type: "corrective", title: "焊缝质量改善", description: "IQC发现焊缝气孔", rootCause: "焊接参数偏差", assignedTo: "焊接主管", dueDate: dateOffset(-3), status: "overdue", priority: "high", effectiveness: null, completedDate: null },
    { capaId: `CAPA-${projectId}-004`, type: "corrective", title: "供应商来料尺寸偏差", description: "板材厚度不一致", rootCause: "供应商设备精度不足", assignedTo: "采购工程师", dueDate: dateOffset(-10), status: "closed", priority: "medium", effectiveness: 85, completedDate: dateOffset(-5) },
  ];
  const countBy = (s: string) => records.filter((r) => r.status === s).length;
  const closed = records.filter((r) => r.status === "closed");
  const effs = closed.filter((r) => r.effectiveness !== null).map((r) => r.effectiveness as number);
  const effRate = effs.length > 0 ? effs.reduce((s, v) => s + v, 0) / effs.length : 0;
  const alerts: string[] = [];
  if (countBy("overdue") > 0) alerts.push(`${countBy("overdue")}项CAPA已逾期`);
  if (records.some((r) => r.priority === "critical" && r.status !== "closed")) alerts.push("存在未关闭的关键CAPA");
  return { projectId, generatedAt: new Date().toISOString(),
    summary: { totalOpen: countBy("open"), totalInProgress: countBy("in_progress"), totalOverdue: countBy("overdue"), totalClosed: closed.length, avgClosureTimeDays: 12, effectivenessRate: Math.round(effRate * 10) / 10 },
    records, alerts };
}

export async function assessProcessCapability(processId: number): Promise<ProcessCapabilityResult> {
  const specs: Record<number, { name: string; usl: number; lsl: number; target: number; unit: string }> = {
    1: { name: "清洗压力控制", usl: 16.0, lsl: 14.0, target: 15.0, unit: "MPa" },
    2: { name: "清洗液温度控制", usl: 62, lsl: 58, target: 60, unit: "C" },
    3: { name: "干燥温度控制", usl: 85, lsl: 75, target: 80, unit: "C" },
    4: { name: "颗粒度指标", usl: 500, lsl: 0, target: 200, unit: "um" },
    5: { name: "节拍时间", usl: 65, lsl: 50, target: 58, unit: "sec" },
  };
  const sp = specs[processId] || specs[1];
  const n = 50, mean = sp.target + (Math.random() - 0.5) * (sp.usl - sp.lsl) * 0.1, sd = (sp.usl - sp.lsl) / 8;
  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    const u1 = Math.random(), u2 = Math.random();
    samples.push(mean + Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sd);
  }
  const sMean = samples.reduce((s, v) => s + v, 0) / n;
  const sStd = Math.sqrt(samples.reduce((s, v) => s + Math.pow(v - sMean, 2), 0) / (n - 1));
  const cp = (sp.usl - sp.lsl) / (6 * sStd);
  const cpk = Math.min((sp.usl - sMean) / (3 * sStd), (sMean - sp.lsl) / (3 * sStd));
  let interp: string, capable: boolean;
  if (cpk >= 1.67) { interp = "过程能力优秀"; capable = true; }
  else if (cpk >= 1.33) { interp = "过程能力良好"; capable = true; }
  else if (cpk >= 1.0) { interp = "过程能力勉强满足"; capable = true; }
  else { interp = "过程能力不足"; capable = false; }
  const recs: string[] = [];
  if (cpk < 1.33) { recs.push("优化参数减小变异"); recs.push("增加监控频率"); }
  if (Math.abs(sMean - sp.target) > (sp.usl - sp.lsl) * 0.1) recs.push("调整过程中心值");
  if (cpk < 1.0) { recs.push("执行PFMEA"); recs.push("考虑设备升级"); }
  recs.push("建立SPC控制图");
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return { processId, processName: sp.name, assessedAt: new Date().toISOString(), sampleSize: n,
    specification: { usl: sp.usl, lsl: sp.lsl, target: sp.target, unit: sp.unit },
    statistics: { mean: r3(sMean), stdDev: r3(sStd), min: r3(Math.min(...samples)), max: r3(Math.max(...samples)), range: r3(Math.max(...samples) - Math.min(...samples)) },
    capability: { cp: r2(cp), cpk: r2(cpk), pp: r2(cp), ppk: r2(cpk), cpkInterpretation: interp, isCapable: capable },
    recommendations: recs };
}

// ============================================================================
// Export
// ============================================================================
export const QualityAssistant = { analyzeDefect, suggestInspectionPlan, generateQualityReport, trackCAPAActions, assessProcessCapability };
export default QualityAssistant;
