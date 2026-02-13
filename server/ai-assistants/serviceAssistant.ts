/**
 * AI Service Assistant - 售后服务助手
 * 故障诊断、维护计划、服务报告、知识库匹配、维修时间估算
 */
import { requireDb } from "../db";

// ============================================================================
// Types
// ============================================================================
export interface DiagnosticStep { stepNumber: number; action: string; expectedResult: string; nextIfPass: number | null; nextIfFail: number | null; }
export interface FaultDiagnosisResult {
  diagnosisId: string; symptoms: string[]; equipmentModel: string; diagnosedAt: string;
  rootCause: string; confidence: number; urgency: "critical" | "high" | "medium" | "low";
  diagnosticSteps: DiagnosticStep[];
  possibleCauses: Array<{ rank: number; cause: string; probability: number; solution: string; requiredParts: string[] }>;
  immediateActions: string[];
}
export interface MaintenanceItem {
  itemId: string; component: string; maintenanceType: "inspection" | "cleaning" | "replacement" | "calibration" | "lubrication";
  description: string; intervalHours: number; intervalDays: number; estimatedDuration: number;
  requiredParts: string[]; skillLevel: "basic" | "intermediate" | "advanced";
}
export interface MaintenancePlan {
  planId: string; equipmentId: number; equipmentModel: string; createdAt: string;
  planType: "preventive" | "predictive" | "combined"; totalAnnualCost: number;
  items: MaintenanceItem[];
  schedule: Array<{ month: number; items: string[]; estimatedDowntime: number }>;
  recommendations: string[];
}
export interface ServiceReport {
  reportId: string; serviceTicketId: string; generatedAt: string;
  equipmentInfo: { model: string; serialNumber: string; installDate: string; location: string };
  serviceDetails: { serviceType: string; reportedIssue: string; diagnosedCause: string; actionsTaken: string[]; partsReplaced: Array<{ partName: string; partNumber: string; quantity: number }>; totalServiceTime: number };
  qualityVerification: { functionalTestPassed: boolean; cleanlinessVerified: boolean; safetyCheckPassed: boolean; performanceMetrics: Record<string, string> };
  recommendations: { immediateActions: string[]; scheduledMaintenance: string[]; upgradeSuggestions: string[] };
  customerSignoff: { required: boolean; status: "pending" | "approved" | "rejected" };
}
export interface KBArticle {
  articleId: string; title: string; category: string; tags: string[];
  relevanceScore: number; summary: string; applicableModels: string[]; lastUpdated: string;
}
export interface KBMatchResult { query: string; matchedAt: string; totalResults: number; articles: KBArticle[]; }
export interface RepairTimeEstimate {
  estimateId: string; faultType: string; equipmentModel: string; estimatedAt: string; estimatedHours: number;
  confidenceRange: { min: number; max: number; confidence: number };
  breakdown: Array<{ phase: string; estimatedHours: number; description: string }>;
  factors: Array<{ factor: string; impact: "increase" | "decrease" | "neutral"; adjustment: number }>;
  historicalBasis: { dataPoints: number; avgRepairTime: number; medianRepairTime: number };
}

// ============================================================================
// Helpers
// ============================================================================
function genId(prefix: string): string { return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`; }

// ============================================================================
// Core Functions
// ============================================================================
type FaultPattern = { keywords: string[]; cause: string; solution: string; parts: string[]; urgency: FaultDiagnosisResult["urgency"]; probability: number };
const FAULT_DB: FaultPattern[] = [
  { keywords: ["清洁度", "不达标", "颗粒", "超标"], cause: "喷嘴堵塞或清洗液浓度不足", solution: "检查清洗喷嘴，检测清洗液浓度", parts: ["清洗喷嘴", "清洗液"], urgency: "high", probability: 0.85 },
  { keywords: ["泄漏", "漏液", "渗漏", "漏水"], cause: "密封件老化或管路松动", solution: "检查密封件，紧固管路连接", parts: ["O型密封圈", "垫片", "管接头"], urgency: "high", probability: 0.80 },
  { keywords: ["噪音", "异响", "振动", "抖动"], cause: "泵体轴承磨损或电机不平衡", solution: "检查轴承振动值，更换磨损轴承", parts: ["轴承", "联轴器"], urgency: "medium", probability: 0.75 },
  { keywords: ["温度", "过热", "升温", "温控"], cause: "冷却系统故障", solution: "清洗热交换器，检查冷却循环", parts: ["热交换器", "冷却液", "温度传感器"], urgency: "high", probability: 0.70 },
  { keywords: ["干燥", "未干", "水渍", "残留水"], cause: "真空系统效能下降", solution: "检查真空泵，清洁管路", parts: ["真空泵滤芯", "真空阀"], urgency: "medium", probability: 0.75 },
  { keywords: ["压力", "低压", "压力不足", "压力波动"], cause: "高压泵磨损或安全阀异常", solution: "检查柱塞密封，校准安全阀", parts: ["泵柱塞密封件", "安全阀弹簧"], urgency: "high", probability: 0.80 },
  { keywords: ["PLC", "控制", "程序", "通讯", "报错"], cause: "PLC通讯或程序异常", solution: "检查通讯线缆，重启PLC", parts: ["通讯线缆", "I/O模块"], urgency: "critical", probability: 0.65 },
  { keywords: ["输送", "卡料", "上料", "下料", "传送"], cause: "输送机构故障或传感器失效", solution: "清理轨道，检查传感器", parts: ["接近传感器", "导轨", "气缸"], urgency: "medium", probability: 0.70 },
];

export async function diagnoseFault(symptoms: string[], equipmentModel: string): Promise<FaultDiagnosisResult> {
  const joined = symptoms.join(" ").toLowerCase();
  const scored = FAULT_DB.map((f) => {
    const mc = f.keywords.filter((k) => joined.includes(k)).length;
    return { ...f, matchScore: f.keywords.length > 0 ? mc / f.keywords.length : 0 };
  }).filter((f) => f.matchScore > 0).sort((a, b) => b.matchScore * b.probability - a.matchScore * a.probability);

  const steps: DiagnosticStep[] = [
    { stepNumber: 1, action: "确认故障现象并记录", expectedResult: "明确故障表现", nextIfPass: 2, nextIfFail: 2 },
    { stepNumber: 2, action: "检查错误代码/报警信息", expectedResult: "获取错误代码", nextIfPass: 3, nextIfFail: 3 },
    { stepNumber: 3, action: "检查运行参数(压力/温度/流量)", expectedResult: "参数正常", nextIfPass: 5, nextIfFail: 4 },
    { stepNumber: 4, action: "定位异常参数对应组件", expectedResult: "锁定故障组件", nextIfPass: 6, nextIfFail: 6 },
    { stepNumber: 5, action: "检查易损件(密封/喷嘴/滤芯)", expectedResult: "状态正常", nextIfPass: 7, nextIfFail: 6 },
    { stepNumber: 6, action: "执行维修/更换", expectedResult: "故障排除", nextIfPass: 8, nextIfFail: 7 },
    { stepNumber: 7, action: "联系GRT技术支持", expectedResult: "获取专家支持", nextIfPass: 8, nextIfFail: null },
    { stepNumber: 8, action: "功能验证测试", expectedResult: "设备恢复正常", nextIfPass: null, nextIfFail: 7 },
  ];
  const top = scored[0];
  const causes = scored.slice(0, 5).map((f, i) => ({ rank: i + 1, cause: f.cause, probability: Math.round(f.matchScore * f.probability * 100), solution: f.solution, requiredParts: f.parts }));
  const actions = ["确保设备安全停机", "记录故障时运行参数"];
  if (top?.urgency === "critical") actions.unshift("立即隔离设备");
  if (top) actions.push(top.solution.split("，")[0]);
  return { diagnosisId: genId("FD"), symptoms, equipmentModel, diagnosedAt: new Date().toISOString(),
    rootCause: top?.cause || "需现场进一步诊断", confidence: top ? Math.round(top.matchScore * top.probability * 100) : 30,
    urgency: top?.urgency || "medium", diagnosticSteps: steps, possibleCauses: causes, immediateActions: actions };
}

export async function suggestMaintenancePlan(equipmentId: number): Promise<MaintenancePlan> {
  const items: MaintenanceItem[] = [
    { itemId: "MI-001", component: "高压泵", maintenanceType: "inspection", description: "检查压力、振动、密封", intervalHours: 500, intervalDays: 30, estimatedDuration: 1, requiredParts: [], skillLevel: "intermediate" },
    { itemId: "MI-002", component: "清洗喷嘴", maintenanceType: "cleaning", description: "清洁喷嘴，检查磨损", intervalHours: 200, intervalDays: 14, estimatedDuration: 0.5, requiredParts: ["清洗喷嘴(备用)"], skillLevel: "basic" },
    { itemId: "MI-003", component: "过滤系统", maintenanceType: "replacement", description: "更换主过滤器滤芯", intervalHours: 1000, intervalDays: 60, estimatedDuration: 1, requiredParts: ["主过滤器滤芯"], skillLevel: "basic" },
    { itemId: "MI-004", component: "密封件", maintenanceType: "replacement", description: "更换关键密封圈", intervalHours: 2000, intervalDays: 180, estimatedDuration: 2, requiredParts: ["O型密封圈套件", "垫片套件"], skillLevel: "intermediate" },
    { itemId: "MI-005", component: "真空系统", maintenanceType: "inspection", description: "检查真空度、泵油", intervalHours: 500, intervalDays: 30, estimatedDuration: 1, requiredParts: ["真空泵油"], skillLevel: "intermediate" },
    { itemId: "MI-006", component: "传感器", maintenanceType: "calibration", description: "校准温度/压力/液位传感器", intervalHours: 2000, intervalDays: 90, estimatedDuration: 2, requiredParts: [], skillLevel: "advanced" },
    { itemId: "MI-007", component: "输送机构", maintenanceType: "lubrication", description: "导轨链条润滑", intervalHours: 500, intervalDays: 30, estimatedDuration: 0.5, requiredParts: ["润滑脂", "链条油"], skillLevel: "basic" },
    { itemId: "MI-008", component: "电气系统", maintenanceType: "inspection", description: "端子紧固、绝缘电阻", intervalHours: 2000, intervalDays: 180, estimatedDuration: 3, requiredParts: [], skillLevel: "advanced" },
    { itemId: "MI-009", component: "清洗液", maintenanceType: "inspection", description: "浓度/pH值检测", intervalHours: 100, intervalDays: 7, estimatedDuration: 0.5, requiredParts: ["清洗液", "pH试纸"], skillLevel: "basic" },
    { itemId: "MI-010", component: "安全系统", maintenanceType: "inspection", description: "急停/安全门联锁测试", intervalHours: 1000, intervalDays: 30, estimatedDuration: 1, requiredParts: [], skillLevel: "intermediate" },
  ];
  const schedule = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1; const mi: string[] = []; let dt = 0;
    for (const it of items) { const iv = Math.max(1, Math.round(it.intervalDays / 30)); if (month % iv === 0 || month === 1) { mi.push(it.component); dt += it.estimatedDuration; } }
    return { month, items: mi, estimatedDowntime: dt };
  });
  const allParts = items.flatMap((i) => i.requiredParts);
  return { planId: genId("MP"), equipmentId, equipmentModel: "GRT-SC800W", createdAt: new Date().toISOString(),
    planType: "combined", totalAnnualCost: Array.from(new Set(allParts)).length * 2000 + items.length * 500,
    items, schedule, recommendations: ["建立运行时间自动记录", "关键备件保持安全库存", "维护后更新日志", "结合IoT实现预测性维护"] };
}

export async function generateServiceReport(serviceTicketId: string): Promise<ServiceReport> {
  const sn = serviceTicketId.replace(/[^0-9]/g, "").slice(0, 6) || "000001";
  return { reportId: genId("SR"), serviceTicketId, generatedAt: new Date().toISOString(),
    equipmentInfo: { model: "GRT-SC800W-SF", serialNumber: `SN-${sn}`, installDate: "2024-06-15", location: "客户工厂A区清洗车间" },
    serviceDetails: { serviceType: "故障维修", reportedIssue: "压力波动，清洁度间歇性不达标", diagnosedCause: "高压泵柱塞密封磨损",
      actionsTaken: ["检查高压泵参数", "拆解检查", "更换密封件", "更换单向阀", "组装调试", "运行测试30min", "清洁度验证"],
      partsReplaced: [{ partName: "高压泵柱塞密封件", partNumber: "GRT-HP-SEAL-001", quantity: 3 }, { partName: "单向阀组件", partNumber: "GRT-HP-CHK-002", quantity: 2 }, { partName: "O型密封圈", partNumber: "GRT-ORING-015", quantity: 6 }],
      totalServiceTime: 6.5 },
    qualityVerification: { functionalTestPassed: true, cleanlinessVerified: true, safetyCheckPassed: true,
      performanceMetrics: { "清洗压力": "15.2 MPa (标准14-16)", "压力波动": "<0.3 MPa", "清洁度": "达标(VDA19.1)", "节拍": "58秒/件" } },
    recommendations: { immediateActions: ["观察运行48小时"], scheduledMaintenance: ["每2000h更换泵密封件", "每500h检查压力振动", "3个月后计划维护"], upgradeSuggestions: ["加装压力在线监测", "考虑陶瓷柱塞泵"] },
    customerSignoff: { required: true, status: "pending" } };
}

export async function matchKBArticles(query: string): Promise<KBMatchResult> {
  const kb: KBArticle[] = [
    { articleId: "KB-001", title: "高压清洗系统维护指南", category: "维护保养", tags: ["高压泵", "清洗", "维护", "压力"], relevanceScore: 0, summary: "高压清洗系统日常维护和故障排查流程", applicableModels: ["GRT-SC800W", "GRT-SC800W-SF", "GRT-HP1200"], lastUpdated: "2025-01-15" },
    { articleId: "KB-002", title: "VDA19.1清洁度检测规程", category: "质量标准", tags: ["清洁度", "VDA19.1", "检测", "颗粒"], relevanceScore: 0, summary: "VDA19.1清洁度检测全流程操作规程", applicableModels: ["ALL"], lastUpdated: "2025-03-01" },
    { articleId: "KB-003", title: "真空干燥系统故障排查", category: "故障排查", tags: ["真空", "干燥", "故障"], relevanceScore: 0, summary: "真空干燥系统常见故障和解决方案", applicableModels: ["GRT-SC800W-SF", "GRT-DC880W-SF"], lastUpdated: "2025-02-20" },
    { articleId: "KB-004", title: "PLC控制通讯故障处理", category: "故障排查", tags: ["PLC", "通讯", "控制", "S7-1500"], relevanceScore: 0, summary: "PLC通讯故障诊断和处理方法", applicableModels: ["ALL"], lastUpdated: "2025-01-30" },
    { articleId: "KB-005", title: "超声波清洗效果优化", category: "工艺优化", tags: ["超声波", "清洗", "频率", "功率"], relevanceScore: 0, summary: "超声波清洗工艺参数优化指南", applicableModels: ["GRT-SC800W", "GRT-MC888W"], lastUpdated: "2025-04-10" },
    { articleId: "KB-006", title: "清洗液管理与浓度控制", category: "工艺管理", tags: ["清洗液", "浓度", "pH"], relevanceScore: 0, summary: "清洗液选择、浓度监控和更换标准", applicableModels: ["ALL"], lastUpdated: "2025-03-15" },
    { articleId: "KB-007", title: "输送系统机械故障诊断", category: "故障排查", tags: ["输送", "机械", "卡料", "链条"], relevanceScore: 0, summary: "输送系统故障诊断决策树", applicableModels: ["GRT-TC2100W", "GRT-RW2000"], lastUpdated: "2025-02-05" },
    { articleId: "KB-008", title: "密封系统维护与泄漏排查", category: "维护保养", tags: ["密封", "泄漏", "O型圈"], relevanceScore: 0, summary: "密封件选型、安装和泄漏排查", applicableModels: ["ALL"], lastUpdated: "2025-01-20" },
  ];
  const tokens = query.toLowerCase().split(/[\s,]+/).filter((t) => t.length > 0);
  const scored = kb.map((a) => {
    const text = `${a.title} ${a.summary} ${a.tags.join(" ")} ${a.category}`.toLowerCase();
    let score = 0;
    for (const t of tokens) { if (text.includes(t)) { score += 1; if (a.title.toLowerCase().includes(t)) score += 0.5; if (a.tags.some((tag) => tag.includes(t))) score += 0.3; } }
    return { ...a, relevanceScore: tokens.length > 0 ? Math.min(1, Math.round((score / tokens.length) * 100) / 100) : 0 };
  }).filter((a) => a.relevanceScore > 0).sort((a, b) => b.relevanceScore - a.relevanceScore);
  return { query, matchedAt: new Date().toISOString(), totalResults: scored.length, articles: scored.slice(0, 5) };
}

export async function estimateRepairTime(faultType: string, equipmentModel: string): Promise<RepairTimeEstimate> {
  type RTD = { avgHours: number; medianHours: number; minHours: number; maxHours: number; dataPoints: number; phases: Array<{ phase: string; hours: number; description: string }> };
  const data: Record<string, RTD> = {
    "压力": { avgHours: 6, medianHours: 5.5, minHours: 3, maxHours: 12, dataPoints: 28, phases: [{ phase: "诊断", hours: 1, description: "故障确认与定位" }, { phase: "备件", hours: 0.5, description: "备件准备" }, { phase: "拆卸", hours: 1.5, description: "拆卸组件" }, { phase: "维修", hours: 1.5, description: "更换密封件/阀门" }, { phase: "组装", hours: 1, description: "组装调试" }, { phase: "验证", hours: 0.5, description: "压力测试" }] },
    "泄漏": { avgHours: 4, medianHours: 3.5, minHours: 1.5, maxHours: 8, dataPoints: 42, phases: [{ phase: "诊断", hours: 0.5, description: "定位泄漏点" }, { phase: "备件", hours: 0.5, description: "准备密封件" }, { phase: "维修", hours: 2, description: "更换密封件" }, { phase: "验证", hours: 1, description: "保压测试" }] },
    "清洁度": { avgHours: 5, medianHours: 4, minHours: 2, maxHours: 10, dataPoints: 35, phases: [{ phase: "诊断", hours: 1, description: "分析清洁度数据" }, { phase: "维修", hours: 2, description: "清洁/更换/调参" }, { phase: "调试", hours: 1, description: "工艺优化" }, { phase: "验证", hours: 1, description: "清洁度验证" }] },
    "电气": { avgHours: 8, medianHours: 7, minHours: 2, maxHours: 16, dataPoints: 18, phases: [{ phase: "诊断", hours: 2, description: "电气故障定位" }, { phase: "备件", hours: 1, description: "获取备件" }, { phase: "维修", hours: 3, description: "更换电气组件" }, { phase: "调试", hours: 2, description: "功能测试" }] },
    "干燥": { avgHours: 5, medianHours: 4.5, minHours: 2, maxHours: 10, dataPoints: 22, phases: [{ phase: "诊断", hours: 1, description: "检查真空系统" }, { phase: "维修", hours: 2, description: "维修真空泵" }, { phase: "调试", hours: 1, description: "调整参数" }, { phase: "验证", hours: 1, description: "效果验证" }] },
  };
  let matched = data["泄漏"];
  for (const [key, val] of Object.entries(data)) { if (faultType.includes(key)) { matched = val; break; } }
  const mf: Record<string, number> = { "GRT-SC800W": 1.0, "GRT-SC800W-SF": 1.1, "GRT-DC880W": 1.15, "GRT-DC880W-SF": 1.2, "GRT-MC888W": 1.25, "GRT-TC2100W": 1.3, "GRT-RW2000": 1.35, "GRT-RW3000": 1.4, "GRT-HP1200": 0.8 };
  const f = mf[equipmentModel] || 1.0;
  const adj = matched.avgHours * f;
  const factors: RepairTimeEstimate["factors"] = [];
  if (f > 1.0) factors.push({ factor: `${equipmentModel}复杂度`, impact: "increase", adjustment: Math.round((f - 1) * matched.avgHours * 10) / 10 });
  else if (f < 1.0) factors.push({ factor: `${equipmentModel}结构简单`, impact: "decrease", adjustment: Math.round((1 - f) * matched.avgHours * 10) / 10 });
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return { estimateId: genId("RTE"), faultType, equipmentModel, estimatedAt: new Date().toISOString(), estimatedHours: r1(adj),
    confidenceRange: { min: r1(matched.minHours * f), max: r1(matched.maxHours * f), confidence: 0.85 },
    breakdown: matched.phases.map((p) => ({ phase: p.phase, estimatedHours: r1(p.hours * f), description: p.description })),
    factors, historicalBasis: { dataPoints: matched.dataPoints, avgRepairTime: matched.avgHours, medianRepairTime: matched.medianHours } };
}

// ============================================================================
// Export
// ============================================================================
export const ServiceAssistant = { diagnoseFault, suggestMaintenancePlan, generateServiceReport, matchKBArticles, estimateRepairTime };
export default ServiceAssistant;
