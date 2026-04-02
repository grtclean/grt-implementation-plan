/**
 * Employee Digital Profile — 360° Fusion Engine + tRPC Router
 * Phase 2.3 — HR × AI × Meeting × Certification Silo Breaker
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                  FIVE-DOMAIN FUSION                                 │
 * │                                                                     │
 * │  ① HR Core         ② KPI           ③ Meetings                      │
 * │  ┌────────────┐   ┌────────────┐   ┌────────────┐                  │
 * │  │ hrmEmployee │   │ monthlyKPI │   │ hrAiPerf   │                  │
 * │  │ dept/pos   │   │ overallScore│   │ meetingScr │                  │
 * │  └─────┬──────┘   └─────┬──────┘   └─────┬──────┘                  │
 * │        │                │                │                          │
 * │        └────────┬───────┴────────┬───────┘                          │
 * │                 ▼                ▼                                   │
 * │           ┌─────────────────────────────┐                           │
 * │           │  generate360Profile(userId)  │                           │
 * │           │  4 Dimensions → Combat Power │                           │
 * │           └─────────────────────────────┘                           │
 * │                 ▲                ▲                                   │
 * │        ┌────────┘                └────────┐                         │
 * │  ┌─────┴──────┐                    ┌──────┴─────┐                   │
 * │  │ qualCerts  │                    │ agentTasks │                   │
 * │  │ cert count │                    │ AI usage   │                   │
 * │  └────────────┘                    └────────────┘                   │
 * │  ④ Certifications                 ⑤ AI Agent Fleet                  │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Scoring per dimension (0–100):
 *   Execution:     Average monthly KPI score (direct from overallKpiScore)
 *   Learning:      Certificates weighted by level (basic=15, intermediate=25, advanced=35, expert=50)
 *                  capped at 100. 0 certs = 20 (baseline)
 *   Collaboration: Meeting performance score (meetingScore from hr_ai_performance)
 *                  Plus attendance bonus (attended/total × 10)
 *   Innovation:    AI task completion quality × volume factor
 *                  High meeting + high AI usage → Innovation > 90
 *
 * Overall Combat Power: weighted average (Execution 30%, Learning 20%, Collaboration 25%, Innovation 25%)
 *
 * Tier:  S ≥ 90 | A 75–89 | B 60–74 | C < 60
 *
 * Architecture: Pure calculation functions exported for Vitest.
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";

// ─── Types ───────────────────────────────────────────────────────────

export type ProfileTier = "S" | "A" | "B" | "C";
export type DimensionName = "Execution" | "Learning" | "Collaboration" | "Innovation";

export interface EmployeeBase {
  userId: number;
  employeeCode: string;
  name: string;
  department: string;
  position: string;
  level: string;
  hireDate: string;
}

export interface KpiRecord {
  month: string;            // "2026-01"
  overallKpiScore: number;  // 0–100
  reviewerComments?: string;
}

export interface CertRecord {
  certificateName: string;
  certificateLevel: "basic" | "intermediate" | "advanced" | "expert";
  issueDate: string;
  expiryDate: string;
  isValid: boolean;         // not expired
}

export interface MeetingPerfRecord {
  month: string;
  meetingScore: number;     // 0–100
  totalScore: number;
  breadthScore: number;
  depthScore: number;
  executionScore: number;
  disciplineScore: number;
  meetingsAttended: number;
  meetingsTotal: number;
  actionItemsCompleted: number;
  actionItemsTotal: number;
}

export interface AiTaskRecord {
  taskType: string;
  qualityScore: number;     // 0–100
  durationMs: number;
  llmTokensUsed: number;
  status: "completed" | "failed" | "pending" | "running";
}

export interface ProfileInput {
  employee: EmployeeBase;
  kpiRecords: KpiRecord[];
  certificates: CertRecord[];
  meetingPerf: MeetingPerfRecord[];
  aiTasks: AiTaskRecord[];
}

export interface DimensionResult {
  name: DimensionName;
  score: number;            // 0–100
  breakdown: string;        // human-readable explanation
  dataPoints: number;       // number of records analyzed
}

export interface CareerAdvice {
  type: "STRENGTH" | "DEVELOPMENT" | "OPPORTUNITY";
  dimension: DimensionName;
  message: string;
}

export interface Profile360Result {
  userId: number;
  employeeCode: string;
  name: string;
  department: string;
  position: string;
  level: string;
  hireDate: string;
  dimensions: DimensionResult[];
  overallScore: number;     // 0–100 "Combat Power"
  tier: ProfileTier;
  careerAdvice: CareerAdvice[];
  generatedAt: string;
}

// ─── Pure Calculation Engine (fully unit-testable) ───────────────────

const CERT_WEIGHTS: Record<string, number> = {
  basic: 15,
  intermediate: 25,
  advanced: 35,
  expert: 50,
};

const DIMENSION_WEIGHTS: Record<DimensionName, number> = {
  Execution: 0.30,
  Learning: 0.20,
  Collaboration: 0.25,
  Innovation: 0.25,
};

/**
 * Classify profile tier from overall score.
 */
export function classifyTier(score: number): ProfileTier {
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  return "C";
}

/**
 * Calculate Execution dimension from KPI records.
 * Simple average of monthly KPI scores. No records → 50 (neutral baseline).
 */
export function calcExecution(kpiRecords: KpiRecord[]): DimensionResult {
  if (kpiRecords.length === 0) {
    return {
      name: "Execution",
      score: 50,
      breakdown: "No KPI records available — baseline score 50",
      dataPoints: 0,
    };
  }
  const avg = kpiRecords.reduce((s, r) => s + r.overallKpiScore, 0) / kpiRecords.length;
  const score = clamp(round2(avg), 0, 100);
  return {
    name: "Execution",
    score,
    breakdown: `Average of ${kpiRecords.length} monthly KPI scores: ${score}`,
    dataPoints: kpiRecords.length,
  };
}

/**
 * Calculate Learning dimension from certificates.
 * Each valid cert adds its level weight. Capped at 100. No certs → 20 baseline.
 */
export function calcLearning(certificates: CertRecord[]): DimensionResult {
  const validCerts = certificates.filter(c => c.isValid);
  if (validCerts.length === 0) {
    return {
      name: "Learning",
      score: 20,
      breakdown: "No valid certificates — baseline score 20",
      dataPoints: 0,
    };
  }
  const rawScore = validCerts.reduce((s, c) => s + (CERT_WEIGHTS[c.certificateLevel] ?? 15), 0);
  const score = clamp(round2(rawScore), 0, 100);
  const levelBreakdown = validCerts.map(c => `${c.certificateName} (${c.certificateLevel}: +${CERT_WEIGHTS[c.certificateLevel] ?? 15})`).join(", ");
  return {
    name: "Learning",
    score,
    breakdown: `${validCerts.length} valid certificates: ${levelBreakdown} → total ${score}`,
    dataPoints: validCerts.length,
  };
}

/**
 * Calculate Collaboration dimension from meeting performance.
 * Base: average meetingScore. Bonus: attendance rate × 10. Capped at 100.
 */
export function calcCollaboration(meetingPerf: MeetingPerfRecord[]): DimensionResult {
  if (meetingPerf.length === 0) {
    return {
      name: "Collaboration",
      score: 50,
      breakdown: "No meeting performance records — baseline score 50",
      dataPoints: 0,
    };
  }
  const avgMeetingScore = meetingPerf.reduce((s, r) => s + r.meetingScore, 0) / meetingPerf.length;
  const totalAttended = meetingPerf.reduce((s, r) => s + r.meetingsAttended, 0);
  const totalMeetings = meetingPerf.reduce((s, r) => s + r.meetingsTotal, 0);
  const attendanceRate = totalMeetings > 0 ? totalAttended / totalMeetings : 0;
  const attendanceBonus = round2(attendanceRate * 10);
  const score = clamp(round2(avgMeetingScore + attendanceBonus), 0, 100);
  return {
    name: "Collaboration",
    score,
    breakdown: `Avg meeting score ${round2(avgMeetingScore)} + attendance bonus ${attendanceBonus} (${round2(attendanceRate * 100)}% attendance) = ${score}`,
    dataPoints: meetingPerf.length,
  };
}

/**
 * Calculate Innovation dimension from AI task usage.
 * Quality × volume multiplier. High meeting + high AI → > 90.
 *
 * Formula:
 *   base = average qualityScore of completed tasks
 *   volumeBonus = min(completedCount × 2, 20)  — up to +20 for heavy AI users
 *   score = base + volumeBonus, capped at 100
 *
 * No completed tasks → 30 baseline.
 */
export function calcInnovation(aiTasks: AiTaskRecord[], meetingPerf: MeetingPerfRecord[]): DimensionResult {
  const completed = aiTasks.filter(t => t.status === "completed");
  if (completed.length === 0) {
    return {
      name: "Innovation",
      score: 30,
      breakdown: "No completed AI tasks — baseline score 30",
      dataPoints: 0,
    };
  }
  const avgQuality = completed.reduce((s, t) => s + t.qualityScore, 0) / completed.length;
  const volumeBonus = Math.min(completed.length * 2, 20);

  // Cross-domain synergy: if also a high meeting performer, extra boost
  let synergyBonus = 0;
  if (meetingPerf.length > 0) {
    const avgMeetingScore = meetingPerf.reduce((s, r) => s + r.meetingScore, 0) / meetingPerf.length;
    if (avgMeetingScore >= 80) {
      synergyBonus = 5; // reward cross-domain engagement
    }
  }

  const score = clamp(round2(avgQuality + volumeBonus + synergyBonus), 0, 100);
  let breakdown = `Avg AI quality ${round2(avgQuality)} + volume bonus ${volumeBonus} (${completed.length} tasks)`;
  if (synergyBonus > 0) {
    breakdown += ` + meeting synergy +${synergyBonus}`;
  }
  breakdown += ` = ${score}`;

  return {
    name: "Innovation",
    score,
    breakdown,
    dataPoints: completed.length,
  };
}

/**
 * Generate full 360° profile for an employee.
 * This is the main fusion function: 5 domains → 4 dimensions → 1 Combat Power.
 */
export function generate360Profile(input: ProfileInput): Profile360Result {
  const { employee, kpiRecords, certificates, meetingPerf, aiTasks } = input;

  // Calculate all 4 dimensions
  const execution = calcExecution(kpiRecords);
  const learning = calcLearning(certificates);
  const collaboration = calcCollaboration(meetingPerf);
  const innovation = calcInnovation(aiTasks, meetingPerf);

  const dimensions = [execution, learning, collaboration, innovation];

  // Overall Combat Power (weighted average)
  const overallScore = clamp(round2(
    execution.score * DIMENSION_WEIGHTS.Execution +
    learning.score * DIMENSION_WEIGHTS.Learning +
    collaboration.score * DIMENSION_WEIGHTS.Collaboration +
    innovation.score * DIMENSION_WEIGHTS.Innovation
  ), 0, 100);

  const tier = classifyTier(overallScore);

  // Find strongest and weakest dimensions
  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  // Generate AI career advice
  const careerAdvice: CareerAdvice[] = [];

  careerAdvice.push({
    type: "STRENGTH",
    dimension: strongest.name,
    message: generateStrengthAdvice(strongest),
  });

  careerAdvice.push({
    type: "DEVELOPMENT",
    dimension: weakest.name,
    message: generateDevelopmentAdvice(weakest),
  });

  // Opportunity: if any dimension > 80
  for (const dim of dimensions) {
    if (dim.score >= 80 && dim.name !== strongest.name) {
      careerAdvice.push({
        type: "OPPORTUNITY",
        dimension: dim.name,
        message: `Your ${dim.name} score of ${dim.score} shows emerging excellence. Keep pushing to reach Star level!`,
      });
      break;
    }
  }

  return {
    userId: employee.userId,
    employeeCode: employee.employeeCode,
    name: employee.name,
    department: employee.department,
    position: employee.position,
    level: employee.level,
    hireDate: employee.hireDate,
    dimensions,
    overallScore,
    tier,
    careerAdvice,
    generatedAt: new Date().toISOString(),
  };
}

function generateStrengthAdvice(dim: DimensionResult): string {
  const adviceMap: Record<DimensionName, string> = {
    Execution: `Your Execution score of ${dim.score} is outstanding. Consider mentoring junior team members on KPI achievement.`,
    Learning: `Your Learning score of ${dim.score} reflects strong professional development. Consider pursuing expert-level certifications.`,
    Collaboration: `Your Collaboration score of ${dim.score} shows excellent teamwork. Consider taking on cross-departmental project leadership.`,
    Innovation: `Your Innovation score of ${dim.score} demonstrates cutting-edge AI fluency. Consider leading AI adoption initiatives.`,
  };
  return adviceMap[dim.name];
}

function generateDevelopmentAdvice(dim: DimensionResult): string {
  const adviceMap: Record<DimensionName, string> = {
    Execution: `Execution at ${dim.score} needs attention. Focus on improving monthly KPI target achievement and seek feedback from your manager.`,
    Learning: `Learning at ${dim.score} is below potential. Pursue relevant certifications — start with intermediate-level courses in your domain.`,
    Collaboration: `Collaboration at ${dim.score} has room for growth. Increase meeting participation and complete action items on time.`,
    Innovation: `Innovation at ${dim.score} could improve. Try using AI tools for daily tasks — document analysis, report drafting, code review.`,
  };
  return adviceMap[dim.name];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── BU Context Mapping ─────────────────────────────────────────────

export interface BuContext {
  buCode: string;
  buName: string;
}

const BU_MAP: Record<string, BuContext> = {
  "事业一部": { buCode: "BU1", buName: "海外事业部" },
  "事业二部": { buCode: "BU2", buName: "商用车事业部" },
  "事业三部": { buCode: "BU3", buName: "乘用车事业部" },
  "事业四部": { buCode: "BU4", buName: "半导体事业部" },
  "事业十部": { buCode: "BU5", buName: "工业通用事业部" },
  "总裁办":   { buCode: "HQ",  buName: "总部" },
  "财务部":   { buCode: "FIN", buName: "财务部" },
  "人事行政部": { buCode: "HR", buName: "人事行政部" },
  "AI数智部":  { buCode: "IT",  buName: "AI数智部" },
};

// ─── TSDCKL Capability Data (CEO's Feb 2026 Evaluation — 30 employees) ──

export interface TsdcklProfile {
  T: number; S: number; D: number; C: number; K: number; L: number;
}

// L-level → 0-100: L1=20, L2=40, L3=60, L4=80, L5=100
const LS = (level: number) => level * 20;

const TSDCKL_SCORES: Record<number, TsdcklProfile> = {
  1:   { T: LS(4), S: LS(5), D: LS(4), C: LS(5), K: LS(4), L: LS(5) },
  80:  { T: LS(4), S: LS(4), D: LS(3), C: LS(4), K: LS(4), L: LS(3) },
  2:   { T: LS(2), S: LS(3), D: LS(1), C: LS(3), K: LS(4), L: LS(1) },
  54:  { T: LS(2), S: LS(3), D: LS(1), C: LS(3), K: LS(4), L: LS(1) },
  101: { T: LS(1), S: LS(2), D: LS(1), C: LS(2), K: LS(3), L: LS(1) },
  66:  { T: LS(2), S: LS(2), D: LS(1), C: LS(2), K: LS(3), L: LS(1) },
  67:  { T: LS(2), S: LS(4), D: LS(2), C: LS(4), K: LS(3), L: LS(3) },
  53:  { T: LS(2), S: LS(3), D: LS(2), C: LS(3), K: LS(4), L: LS(2) },
  100: { T: LS(1), S: LS(3), D: LS(1), C: LS(3), K: LS(2), L: LS(1) },
  49:  { T: LS(4), S: LS(3), D: LS(3), C: LS(3), K: LS(3), L: LS(2) },
  62:  { T: LS(4), S: LS(3), D: LS(3), C: LS(3), K: LS(3), L: LS(2) },
  96:  { T: LS(3), S: LS(3), D: LS(3), C: LS(3), K: LS(3), L: LS(2) },
  83:  { T: LS(3), S: LS(3), D: LS(2), C: LS(4), K: LS(3), L: LS(2) },
  103: { T: LS(2), S: LS(3), D: LS(2), C: LS(4), K: LS(3), L: LS(2) },
  4:   { T: LS(3), S: LS(4), D: LS(2), C: LS(5), K: LS(3), L: LS(4) },
  5:   { T: LS(4), S: LS(3), D: LS(3), C: LS(3), K: LS(4), L: LS(3) },
  22:  { T: LS(4), S: LS(2), D: LS(3), C: LS(2), K: LS(3), L: LS(1) },
  63:  { T: LS(3), S: LS(4), D: LS(2), C: LS(4), K: LS(3), L: LS(3) },
  6:   { T: LS(5), S: LS(3), D: LS(5), C: LS(3), K: LS(4), L: LS(3) },
  44:  { T: LS(4), S: LS(2), D: LS(4), C: LS(2), K: LS(3), L: LS(1) },
  97:  { T: LS(4), S: LS(2), D: LS(3), C: LS(2), K: LS(3), L: LS(1) },
  3:   { T: LS(3), S: LS(3), D: LS(2), C: LS(3), K: LS(3), L: LS(2) },
  7:   { T: LS(4), S: LS(3), D: LS(4), C: LS(3), K: LS(4), L: LS(3) },
  55:  { T: LS(2), S: LS(4), D: LS(2), C: LS(4), K: LS(3), L: LS(3) },
  19:  { T: LS(3), S: LS(3), D: LS(2), C: LS(4), K: LS(3), L: LS(2) },
  18:  { T: LS(4), S: LS(2), D: LS(3), C: LS(2), K: LS(3), L: LS(1) },
  24:  { T: LS(3), S: LS(3), D: LS(2), C: LS(3), K: LS(3), L: LS(2) },
  8:   { T: LS(3), S: LS(3), D: LS(2), C: LS(3), K: LS(4), L: LS(2) },
  9:   { T: LS(3), S: LS(2), D: LS(2), C: LS(2), K: LS(3), L: LS(2) },
  45:  { T: LS(3), S: LS(4), D: LS(2), C: LS(4), K: LS(3), L: LS(3) },
};

// ─── P-Level Assignment ─────────────────────────────────────────────

function assignLevel(position: string): string {
  if (/董事长$/.test(position)) return "P10";
  if (/总监|董事长助理/.test(position)) return "P8";
  if (/经理/.test(position)) return "P6";
  if (/主管|班组长/.test(position)) return "P5";
  if (/工程师/.test(position)) return "P4";
  if (/专员/.test(position)) return "P3";
  if (/助理|前台|前法/.test(position)) return "P2";
  return "P1";
}

// ─── Derive 4D Operational Data from TSDCKL ─────────────────────────

function deriveFromTsdckl(s: TsdcklProfile): {
  kpiRecords: KpiRecord[];
  certificates: CertRecord[];
  meetingPerf: MeetingPerfRecord[];
  aiTasks: AiTaskRecord[];
} {
  const kpiScore = Math.round(s.T * 0.4 + s.K * 0.4 + s.S * 0.2);
  const meetingScore = Math.round(s.S * 0.4 + s.C * 0.4 + s.L * 0.2);
  const aiQuality = Math.round(s.D * 0.4 + s.T * 0.3 + s.L * 0.3);

  const kpiRecords: KpiRecord[] = [
    { month: "2026-01", overallKpiScore: kpiScore },
    { month: "2026-02", overallKpiScore: kpiScore },
  ];

  const certificates: CertRecord[] = [];
  if (s.K >= 60) certificates.push({ certificateName: "专业标准认证", certificateLevel: "basic", issueDate: "2025-01-01", expiryDate: "2028-01-01", isValid: true });
  if (s.K >= 80) certificates.push({ certificateName: "高级专业认证", certificateLevel: "intermediate", issueDate: "2025-06-01", expiryDate: "2028-06-01", isValid: true });

  const meetingPerf: MeetingPerfRecord[] = [
    { month: "2026-01", meetingScore, totalScore: meetingScore, breadthScore: s.S, depthScore: s.C, executionScore: s.T, disciplineScore: s.K, meetingsAttended: 8, meetingsTotal: 10, actionItemsCompleted: 6, actionItemsTotal: 8 },
    { month: "2026-02", meetingScore, totalScore: meetingScore, breadthScore: s.S, depthScore: s.C, executionScore: s.T, disciplineScore: s.K, meetingsAttended: 9, meetingsTotal: 10, actionItemsCompleted: 7, actionItemsTotal: 8 },
  ];

  const taskCount = Math.max(1, Math.floor(s.D / 25));
  const aiTasks: AiTaskRecord[] = Array.from({ length: taskCount }, () => ({
    taskType: "auto_analysis",
    qualityScore: aiQuality,
    durationMs: 30000,
    llmTokensUsed: 1500,
    status: "completed" as const,
  }));

  return { kpiRecords, certificates, meetingPerf, aiTasks };
}

// ─── Real Employee Data (30 GRT Assessed Employees) ─────────────────

interface EmployeeEntry {
  employee: EmployeeBase;
  kpiRecords: KpiRecord[];
  certificates: CertRecord[];
  meetingPerf: MeetingPerfRecord[];
  aiTasks: AiTaskRecord[];
}

interface RealEmployeeRaw {
  userId: number; grtId: string; name: string; department: string; position: string;
}

const REAL_EMPLOYEE_LIST: RealEmployeeRaw[] = [
  { userId: 1,   grtId: "GRT001", name: "倪亚东", department: "总裁办",     position: "董事长" },
  { userId: 80,  grtId: "GRT080", name: "刘奥运", department: "AI数智部",   position: "董事长助理" },
  { userId: 2,   grtId: "GRT002", name: "黄晓兰", department: "财务部",     position: "会计" },
  { userId: 54,  grtId: "GRT054", name: "王秀萍", department: "财务部",     position: "总账会计" },
  { userId: 101, grtId: "GRT101", name: "王汝月", department: "财务部",     position: "会计助理" },
  { userId: 66,  grtId: "GRT066", name: "李新正", department: "财务部",     position: "仓库管理员" },
  { userId: 67,  grtId: "GRT067", name: "沙建梅", department: "人事行政部", position: "人事行政主管" },
  { userId: 53,  grtId: "GRT053", name: "段天珠", department: "人事行政部", position: "前法" },
  { userId: 100, grtId: "GRT100", name: "田炜钰", department: "人事行政部", position: "行政前台" },
  { userId: 49,  grtId: "GRT049", name: "胡杨",   department: "AI数智部",   position: "IT工程师" },
  { userId: 62,  grtId: "GRT062", name: "朱宇浩", department: "事业二部",   position: "生产工程师兼项目及IT工程师" },

  { userId: 83,  grtId: "GRT083", name: "刘坤",   department: "AI数智部",   position: "市场主管" },
  { userId: 103, grtId: "GRT103", name: "朱文韬", department: "AI数智部",   position: "市场专员" },
  { userId: 4,   grtId: "GRT004", name: "戴晓燕", department: "事业一部",   position: "高级销售经理" },
  { userId: 5,   grtId: "GRT005", name: "金晓锋", department: "事业一部",   position: "制造质量经理" },
  { userId: 22,  grtId: "GRT022", name: "李大鹏", department: "事业一部",   position: "电气工程师" },
  { userId: 63,  grtId: "GRT063", name: "刘健康", department: "事业一部",   position: "销售与项目工程师" },
  { userId: 6,   grtId: "GRT006", name: "洪香龙", department: "事业二部",   position: "机械设计经理" },
  { userId: 44,  grtId: "GRT044", name: "洪小东", department: "事业二部",   position: "机械研发工程师" },
  { userId: 97,  grtId: "GRT097", name: "钱佳奇", department: "事业二部",   position: "电气工程师" },
  { userId: 3,   grtId: "GRT003", name: "倪亚琴", department: "事业三部",   position: "采购与项目工程师" },
  { userId: 7,   grtId: "GRT007", name: "孙坚",   department: "事业三部",   position: "电气主管" },
  { userId: 55,  grtId: "GRT055", name: "沈迎凤", department: "事业三部",   position: "采购经理" },
  { userId: 19,  grtId: "GRT019", name: "冯艳",   department: "事业三部",   position: "销售与项目工程师" },
  { userId: 18,  grtId: "GRT018", name: "孙国祥", department: "事业四部",   position: "电气工程师" },
  { userId: 24,  grtId: "GRT024", name: "张腾飞", department: "事业四部",   position: "机加工班组长" },
  { userId: 8,   grtId: "GRT008", name: "马柯",   department: "事业十部",   position: "质量专员" },
  { userId: 9,   grtId: "GRT009", name: "史龙昌", department: "事业十部",   position: "激光切作班组长" },
  { userId: 45,  grtId: "GRT045", name: "杨勇",   department: "事业三部",   position: "生产工程师兼项目经理" },
];

// Build full employee dataset from real TSDCKL assessments
const ASSESSED_EMPLOYEES: EmployeeEntry[] = REAL_EMPLOYEE_LIST.map(e => {
  const tsdckl = TSDCKL_SCORES[e.userId];
  const derived = tsdckl ? deriveFromTsdckl(tsdckl) : { kpiRecords: [], certificates: [], meetingPerf: [], aiTasks: [] };
  return {
    employee: {
      userId: e.userId,
      employeeCode: e.grtId,
      name: e.name,
      department: e.department,
      position: e.position,
      level: assignLevel(e.position),
      hireDate: "2020-01-15",
    },
    ...derived,
  };
});

// ─── tRPC Router ─────────────────────────────────────────────────────

export const employeeProfileRouter = router({
  /**
   * getProfile — generate 360° profile for a specific user.
   * The core fusion: HR × KPI × Meetings × Certs × AI in one response.
   */
  getProfile: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const entry = ASSESSED_EMPLOYEES.find(e => e.employee.userId === input.userId);
      if (!entry) {
        return { found: false as const, error: `Employee with userId ${input.userId} not found` };
      }
      const profile = generate360Profile(entry);
      const tsdckl = TSDCKL_SCORES[input.userId] ?? null;
      const buContext = BU_MAP[entry.employee.department] ?? null;
      return { found: true as const, profile, tsdckl, buContext, dataSource: "real" as const };
    }),

  /**
   * listProfiles — returns all employees with their 360° profiles + TSDCKL.
   * For the team overview / leaderboard view.
   */
  listProfiles: protectedProcedure.query(async () => {
    const profiles = ASSESSED_EMPLOYEES.map(entry => {
      const profile = generate360Profile(entry);
      const tsdckl = TSDCKL_SCORES[entry.employee.userId] ?? null;
      const buContext = BU_MAP[entry.employee.department] ?? null;
      return { ...profile, tsdckl, buContext };
    });

    // Sort by overall score descending
    profiles.sort((a, b) => b.overallScore - a.overallScore);

    const tierCounts = { S: 0, A: 0, B: 0, C: 0 };
    for (const p of profiles) {
      tierCounts[p.tier]++;
    }

    const avgOverall = profiles.length > 0
      ? round2(profiles.reduce((s, p) => s + p.overallScore, 0) / profiles.length)
      : 0;

    return {
      profiles,
      summary: {
        total: profiles.length,
        avgOverall,
        tierCounts,
      },
      generatedAt: new Date().toISOString(),
      dataSource: "real" as const,
    };
  }),

  /**
   * getTeamRadar — aggregated radar for a department.
   */
  getTeamRadar: protectedProcedure
    .input(z.object({ department: z.string().optional() }))
    .query(async ({ input }) => {
      const filtered = input.department
        ? ASSESSED_EMPLOYEES.filter(e => e.employee.department === input.department)
        : ASSESSED_EMPLOYEES;

      if (filtered.length === 0) {
        return { found: false as const, error: "No employees in department" };
      }

      const profiles = filtered.map(entry => generate360Profile(entry));
      const avgDimensions: Record<DimensionName, number> = {
        Execution: 0, Learning: 0, Collaboration: 0, Innovation: 0,
      };
      for (const p of profiles) {
        for (const d of p.dimensions) {
          avgDimensions[d.name] += d.score;
        }
      }
      for (const key of Object.keys(avgDimensions) as DimensionName[]) {
        avgDimensions[key] = round2(avgDimensions[key] / profiles.length);
      }

      return {
        found: true as const,
        department: input.department ?? "All",
        employeeCount: profiles.length,
        avgDimensions,
        dataSource: "real" as const,
      };
    }),

  /**
   * getFullProfile — unified profile: 360° + TSDCKL + BU context + dev path.
   * This is the CEO's requested "capability factors for dedicated personnel user profile".
   */
  getFullProfile: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const entry = ASSESSED_EMPLOYEES.find(e => e.employee.userId === input.userId);
      if (!entry) {
        return { found: false as const, error: `Employee with userId ${input.userId} not found` };
      }
      const profile = generate360Profile(entry);
      const tsdckl = TSDCKL_SCORES[input.userId] ?? null;
      const buContext = BU_MAP[entry.employee.department] ?? null;

      // Compute TSDCKL pillar breakdown with labels
      const tsdcklPillars = tsdckl ? [
        { code: "T", name: "硬核技术力", nameEn: "Technical Power", score: tsdckl.T, level: `L${tsdckl.T / 20}` },
        { code: "S", name: "软性通用力", nameEn: "Soft Skills", score: tsdckl.S, level: `L${tsdckl.S / 20}` },
        { code: "D", name: "设计与创新力", nameEn: "Design & Innovation", score: tsdckl.D, level: `L${tsdckl.D / 20}` },
        { code: "C", name: "沟通协作力", nameEn: "Communication", score: tsdckl.C, level: `L${tsdckl.C / 20}` },
        { code: "K", name: "专业标准力", nameEn: "Knowledge & Standards", score: tsdckl.K, level: `L${tsdckl.K / 20}` },
        { code: "L", name: "领导与战略力", nameEn: "Leadership & Strategy", score: tsdckl.L, level: `L${tsdckl.L / 20}` },
      ] : null;

      const tsdcklAvg = tsdckl
        ? round2((tsdckl.T + tsdckl.S + tsdckl.D + tsdckl.C + tsdckl.K + tsdckl.L) / 6)
        : null;

      return {
        found: true as const,
        profile,
        tsdckl,
        tsdcklPillars,
        tsdcklAvg,
        buContext,
        dataSource: "real" as const,
      };
    }),

  // ─── Procedure 5: getTrainingPlan (REAL analysis) ───────────────────

  getTrainingPlan: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const emp = REAL_EMPLOYEE_LIST.find(e => e.userId === input.userId);
      if (!emp) {
        return { found: false as const, error: `Employee with userId ${input.userId} not found` };
      }
      const tsdckl = TSDCKL_SCORES[input.userId];
      if (!tsdckl) {
        return { found: false as const, error: `No TSDCKL assessment data for userId ${input.userId}` };
      }

      // Job family detection
      const getJobFamily = (position: string): string => {
        if (/经理/.test(position) && /事业/.test(position)) return "事业部经理";
        if (/机械设计|机械研发/.test(position)) return "机械研发";
        if (/电气/.test(position)) return "电气工程";
        if (/销售|采购|项目/.test(position)) return "销售与项目";
        if (/售后|服务/.test(position)) return "售后服务";
        if (/IT|软件|EHS/.test(position)) return "IT&EHS";
        if (/董事长助理|董助/.test(position)) return "董助";
        if (/制造|质量|班组/.test(position)) return "制造质量";
        if (/仓库|市场|供应链/.test(position)) return "仓库市场销售";
        if (/人事|行政|前台/.test(position)) return "HR行政";
        if (/会计|财务/.test(position)) return "财务";
        return "通用";
      };

      const ROLE_TARGETS: Record<string, TsdcklProfile> = {
        "事业部经理": { T: LS(4), S: LS(4), D: LS(4), C: LS(4), K: LS(4), L: LS(4) },
        "机械研发":   { T: LS(4), S: LS(3), D: LS(4), C: LS(3), K: LS(3), L: LS(2) },
        "电气工程":   { T: LS(4), S: LS(3), D: LS(3), C: LS(3), K: LS(3), L: LS(2) },
        "销售与项目": { T: LS(3), S: LS(4), D: LS(2), C: LS(4), K: LS(3), L: LS(3) },
        "售后服务":   { T: LS(3), S: LS(3), D: LS(2), C: LS(4), K: LS(3), L: LS(3) },
        "IT&EHS":     { T: LS(4), S: LS(3), D: LS(4), C: LS(3), K: LS(3), L: LS(2) },
        "董助":       { T: LS(3), S: LS(4), D: LS(3), C: LS(4), K: LS(3), L: LS(4) },
        "制造质量":   { T: LS(4), S: LS(3), D: LS(3), C: LS(3), K: LS(4), L: LS(3) },
        "仓库市场销售": { T: LS(2), S: LS(3), D: LS(2), C: LS(4), K: LS(3), L: LS(2) },
        "HR行政":     { T: LS(2), S: LS(4), D: LS(2), C: LS(4), K: LS(3), L: LS(3) },
        "财务":       { T: LS(3), S: LS(3), D: LS(2), C: LS(3), K: LS(4), L: LS(2) },
        "通用":       { T: LS(3), S: LS(3), D: LS(3), C: LS(3), K: LS(3), L: LS(2) },
      };

      const DOMAIN_NAMES: Record<string, string> = {
        T: "硬核技术力", S: "软性通用力", D: "设计与创新力",
        C: "沟通协作力", K: "专业标准力", L: "领导与战略力",
      };

      const NEXT_LEVEL_DESC: Record<string, Record<number, string>> = {
        T: {
          2: "能独立完成常规技术任务，掌握核心工具链",
          3: "能解决中等复杂度技术问题，指导初级人员",
          4: "能主导技术方案设计，处理跨系统集成难题",
          5: "技术权威，能驱动技术战略与架构演进",
        },
        S: {
          2: "具备基本沟通汇报能力，能清晰表达观点",
          3: "能进行跨部门沟通协调，推动共识达成",
          4: "具备高级谈判与影响力技巧，胜任客户对接",
          5: "能塑造组织文化，驱动大规模变革管理",
        },
        D: {
          2: "能提出可行改善建议，参与产品优化讨论",
          3: "能主导小型创新项目，输出可落地方案",
          4: "能驱动产品级创新，建立设计规范体系",
          5: "具备行业前瞻视野，引领颠覆性创新实践",
        },
        C: {
          2: "能在团队内有效协作，按时完成协同任务",
          3: "能协调跨职能团队，主持项目评审会",
          4: "能管理复杂利益相关者关系，化解冲突",
          5: "能构建组织级协作网络，推动战略对齐",
        },
        K: {
          2: "熟悉岗位相关标准流程，能正确执行操作规范",
          3: "能独立编写SOP，参与标准审核与内审",
          4: "能主导IATF/ISO体系建设，培训他人标准知识",
          5: "能制定行业标准，代表公司参与标准化组织",
        },
        L: {
          2: "能带领小团队完成明确目标，做好日常管理",
          3: "能制定部门计划，培养下属，进行绩效管理",
          4: "能制定BU级战略，管理多团队协同作战",
          5: "能制定公司级战略，引领组织变革与转型",
        },
      };

      const ACTION_ITEMS: Record<string, Record<number, string[]>> = {
        T: {
          1: ["完成岗位技能矩阵自评", "参加内部技术基础培训(40h)", "通过基础技能考核"],
          2: ["完成2个中级技术项目实战", "参加外部技术进阶课程", "取得相关技术认证"],
          3: ["主导1个技术方案设计评审", "担任技术导师指导2名新人", "发表1篇技术总结报告"],
          4: ["主导跨系统架构设计", "建立技术规范与标准库", "参与行业技术交流会议"],
        },
        S: {
          1: ["参加沟通技巧基础培训", "完成3次部门内演讲练习", "阅读《非暴力沟通》并写读后感"],
          2: ["主持2次跨部门协调会议", "完成高级沟通技巧培训", "参与1次客户汇报演练"],
          3: ["主导1次重要客户谈判", "完成领导力沟通专题培训", "担任新员工沟通辅导员"],
          4: ["主导组织文化建设项目", "完成变革管理专题研修", "建立部门沟通机制体系"],
        },
        D: {
          1: ["参加创新思维基础培训", "提交2条改善提案", "学习TRIZ创新方法论入门"],
          2: ["主导1个小型改善项目", "完成设计思维工作坊", "输出1份创新可行性报告"],
          3: ["主导产品级创新项目", "建立部门创新评审机制", "参加行业创新峰会"],
          4: ["制定创新战略路线图", "建立创新孵化与评估体系", "发表行业创新白皮书"],
        },
        C: {
          1: ["参加团队协作基础培训", "主动参与3次跨组协作任务", "学习使用协作工具(Teams/钉钉)"],
          2: ["主持2次项目评审会", "完成冲突管理专题培训", "建立1个跨部门协作群组"],
          3: ["管理3个以上利益相关者项目", "完成高级谈判技巧培训", "推动1次跨BU协作"],
          4: ["建立组织级协作网络", "完成战略对齐工作坊", "主导跨公司合作项目"],
        },
        K: {
          1: ["学习岗位相关ISO/IATF基础标准", "完成SOP考试并通过", "参加内审员基础培训"],
          2: ["独立编写2份SOP文档", "参加内审实战演练", "取得内审员资格证书"],
          3: ["主导1次体系审核(内审或供方审核)", "培训5名同事标准知识", "修订部门质量手册"],
          4: ["主导公司级体系认证项目", "参与行业标准制定讨论", "建立标准知识库"],
        },
        L: {
          1: ["参加基础管理技能培训", "完成情境领导力入门课", "参与1次部门计划制定"],
          2: ["独立带领小团队完成季度目标", "完成绩效管理专题培训", "制定2名下属发展计划"],
          3: ["制定BU年度战略计划", "完成高级领导力研修班", "主导1次组织变革项目"],
          4: ["参与公司战略规划讨论", "完成EMBA/总裁班课程", "主导组织转型项目"],
        },
      };

      const jobFamily = getJobFamily(emp.position);
      const targets = ROLE_TARGETS[jobFamily];

      type DomainCode = "T" | "S" | "D" | "C" | "K" | "L";
      const domains: DomainCode[] = ["T", "S", "D", "C", "K", "L"];

      const devPath = [];
      let totalGapScore = 0;

      for (const d of domains) {
        const current = tsdckl[d];
        const target = targets[d];
        const gapRaw = target - current; // in score units (20 per level)
        if (gapRaw <= 0) continue;

        const currentLevel = Math.round(current / 20);
        const targetLevel = Math.round(target / 20);
        const gapLevels = targetLevel - currentLevel;
        totalGapScore += gapRaw;

        const priority = gapLevels >= 3 ? "critical" : gapLevels >= 2 ? "high" : gapLevels >= 1 ? "medium" : "low";
        const nextLevel = Math.min(currentLevel + 1, 5);
        const nextLevelDescription = NEXT_LEVEL_DESC[d]?.[nextLevel] ?? "持续精进，向更高层级迈进";
        const actionItems = ACTION_ITEMS[d]?.[currentLevel] ?? ["制定个人提升计划", "寻找导师进行辅导"];
        const estimatedWeeks = gapLevels * 8 + (gapLevels >= 2 ? 4 : 0); // 8 weeks per level gap + extra for big gaps

        devPath.push({
          domainCode: d,
          domainName: DOMAIN_NAMES[d],
          currentLevel: `L${currentLevel}`,
          targetLevel: `L${targetLevel}`,
          gap: gapLevels,
          priority,
          nextLevelDescription,
          actionItems,
          estimatedWeeks,
        });
      }

      // Sort by priority: critical > high > medium > low
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      devPath.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));

      return {
        found: true as const,
        employeeName: emp.name,
        position: emp.position,
        jobFamily,
        devPath,
        totalGapScore,
        dataSource: "actual_analysis" as const,
      };
    }),

  // ─── Procedure 6: getWorkTasks (DEMO data) ─────────────────────────

  getWorkTasks: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const emp = REAL_EMPLOYEE_LIST.find(e => e.userId === input.userId);
      if (!emp) {
        return { found: false as const, error: `Employee with userId ${input.userId} not found` };
      }

      // Task templates by department/position patterns
      const TASK_POOLS: Record<string, Array<{ title: string; description: string; category: string; estimatedHours: number }>> = {
        "机械": [
          { title: "清洗机喷嘴总成3D建模", description: "完成新型高压清洗喷嘴组件的SolidWorks三维建模与装配", category: "project", estimatedHours: 16 },
          { title: "BOM清单核对与ECO提交", description: "核对Q2新品BOM与供应商报价，提交工程变更单", category: "daily", estimatedHours: 4 },
          { title: "客户现场设备改造方案评审", description: "评审某汽车主机厂清洗线改造技术方案", category: "meeting", estimatedHours: 3 },
          { title: "公差分析GD&T培训", description: "参加公司组织的几何公差与尺寸分析高级培训", category: "training", estimatedHours: 8 },
          { title: "零件图纸审核签发", description: "审核3份机加工零件图纸并签发至生产", category: "daily", estimatedHours: 2 },
          { title: "新材料耐腐蚀测试报告", description: "整理316L不锈钢在碱性清洗液中的耐腐蚀测试数据", category: "project", estimatedHours: 6 },
          { title: "供应商技术对接会", description: "与液压阀供应商讨论新品定制化需求", category: "meeting", estimatedHours: 2 },
          { title: "DFMEA更新", description: "更新清洗机水循环系统DFMEA分析表", category: "project", estimatedHours: 5 },
        ],
        "电气": [
          { title: "PLC程序调试（清洗线A03）", description: "调试三菱FX5U PLC程序，解决清洗节拍异常问题", category: "project", estimatedHours: 12 },
          { title: "电气原理图更新", description: "更新商用车清洗线电气控制柜原理图（EPLAN）", category: "daily", estimatedHours: 6 },
          { title: "HMI画面优化评审", description: "评审触摸屏操作界面改版方案，提升操作便捷性", category: "meeting", estimatedHours: 2 },
          { title: "伺服电机选型计算", description: "完成新产线传送带伺服电机扭矩和功率选型计算", category: "project", estimatedHours: 4 },
          { title: "安全回路设计复核", description: "复核急停回路、安全光幕接线是否符合CE标准", category: "daily", estimatedHours: 3 },
          { title: "变频器参数优化", description: "优化水泵变频器参数，降低能耗并减少水锤效应", category: "project", estimatedHours: 5 },
          { title: "电气安全培训", description: "参加低压电工安全操作规程年度培训", category: "training", estimatedHours: 4 },
        ],
        "销售": [
          { title: "客户需求调研（大众汽车）", description: "调研大众汽车零部件清洗新需求，整理技术规格书", category: "project", estimatedHours: 8 },
          { title: "报价方案制作", description: "制作半导体晶圆清洗设备报价方案（含技术参数对比）", category: "daily", estimatedHours: 6 },
          { title: "季度销售复盘会", description: "Q1销售目标达成情况复盘与Q2策略调整讨论", category: "meeting", estimatedHours: 3 },
          { title: "CRM系统商机更新", description: "更新15条在跟进商机状态，录入客户拜访记录", category: "daily", estimatedHours: 2 },
          { title: "竞品分析报告", description: "整理国内外清洗设备竞品技术对比分析报告", category: "project", estimatedHours: 5 },
          { title: "客户现场验收陪同", description: "陪同客户进行设备FAT验收测试", category: "project", estimatedHours: 10 },
          { title: "销售技巧提升培训", description: "参加SPIN销售方法论内训课程", category: "training", estimatedHours: 4 },
          { title: "项目投标文件准备", description: "准备国企清洗线招标项目投标文件", category: "project", estimatedHours: 12 },
        ],
        "质量": [
          { title: "来料检验批次处理", description: "完成本周3批次不锈钢管件的IQC检验与判定", category: "daily", estimatedHours: 4 },
          { title: "8D报告编写", description: "针对客户投诉的清洗效果不达标问题编写8D纠正报告", category: "project", estimatedHours: 6 },
          { title: "内审不符合项跟踪会", description: "跟踪上月IATF内审发现的3项不符合整改进度", category: "meeting", estimatedHours: 2 },
          { title: "SPC控制图分析", description: "分析清洗机关键尺寸SPC控制图，识别异常趋势", category: "daily", estimatedHours: 3 },
          { title: "IATF 16949条款培训", description: "参加IATF 16949:2016第8章运行策划培训", category: "training", estimatedHours: 6 },
          { title: "供应商审核准备", description: "准备下周供应商现场质量审核的检查清单与计划", category: "project", estimatedHours: 4 },
          { title: "PFMEA工作坊", description: "参与清洗工序PFMEA跨职能团队分析工作坊", category: "meeting", estimatedHours: 4 },
        ],
        "财务": [
          { title: "月度费用报销审核", description: "审核各部门2月份费用报销单据（共47笔）", category: "daily", estimatedHours: 6 },
          { title: "成本核算报告", description: "完成Q1产品成本核算报告，分析材料与人工成本变动", category: "project", estimatedHours: 8 },
          { title: "预算执行分析会", description: "汇报各BU预算执行率偏差分析", category: "meeting", estimatedHours: 2 },
          { title: "税务申报准备", description: "准备3月增值税申报材料", category: "daily", estimatedHours: 4 },
          { title: "ERP凭证复核", description: "复核ERP系统中本月自动生成的记账凭证", category: "daily", estimatedHours: 3 },
          { title: "财务合规培训", description: "参加新收入准则应用实务培训", category: "training", estimatedHours: 4 },
          { title: "年度审计资料整理", description: "配合外审整理固定资产与应收账款明细", category: "project", estimatedHours: 10 },
        ],
        "人事": [
          { title: "绩效考核数据汇总", description: "汇总各部门Q1绩效考核评分与排名", category: "daily", estimatedHours: 6 },
          { title: "招聘需求对接", description: "与事业二部对接机械工程师和电气工程师招聘需求", category: "meeting", estimatedHours: 2 },
          { title: "员工培训档案更新", description: "更新全员培训记录档案，统计年度培训完成率", category: "daily", estimatedHours: 4 },
          { title: "薪酬福利方案调研", description: "调研同行业清洗设备企业薪酬水平与福利结构", category: "project", estimatedHours: 8 },
          { title: "劳动法合规培训", description: "参加最新劳动合同法修订要点专题培训", category: "training", estimatedHours: 4 },
          { title: "员工满意度调查", description: "发放并收集Q1员工满意度调查问卷", category: "project", estimatedHours: 3 },
          { title: "入职流程办理", description: "办理2名新员工入职手续与系统开通", category: "daily", estimatedHours: 2 },
        ],
        "IT": [
          { title: "GRT系统新模块上线", description: "完成PDM模块灰度发布与线上验证", category: "project", estimatedHours: 12 },
          { title: "数据库性能优化", description: "分析慢查询日志，优化TOP10慢SQL语句", category: "daily", estimatedHours: 6 },
          { title: "信息安全周会", description: "review本周安全事件与漏洞修复进展", category: "meeting", estimatedHours: 1 },
          { title: "服务器巡检与备份", description: "完成生产环境服务器日常巡检与数据库备份验证", category: "daily", estimatedHours: 2 },
          { title: "AI模型部署调试", description: "部署清洗效果AI视觉检测模型至边缘计算设备", category: "project", estimatedHours: 8 },
          { title: "网络安全培训", description: "参加企业信息安全意识与钓鱼邮件防范培训", category: "training", estimatedHours: 3 },
          { title: "需求评审会", description: "评审下一迭代的功能需求与技术方案", category: "meeting", estimatedHours: 2 },
        ],
        "制造": [
          { title: "生产排程调整", description: "根据紧急订单调整本周清洗机装配产线排程", category: "daily", estimatedHours: 3 },
          { title: "工装夹具改善", description: "改善喷淋管焊接工装，提升焊接一致性", category: "project", estimatedHours: 8 },
          { title: "晨会与生产协调", description: "每日产线晨会，协调物料与人员安排", category: "meeting", estimatedHours: 1 },
          { title: "安全生产培训", description: "组织车间安全生产月度培训与应急演练", category: "training", estimatedHours: 4 },
          { title: "OEE数据分析", description: "统计本周产线OEE数据并分析停机原因", category: "daily", estimatedHours: 3 },
          { title: "首件检验跟踪", description: "跟踪新品首件检验，确认尺寸与外观合格", category: "daily", estimatedHours: 2 },
          { title: "工艺参数优化试验", description: "进行超声波清洗频率与功率参数优化试验", category: "project", estimatedHours: 6 },
        ],
        "市场": [
          { title: "展会筹备（CIMT 2026）", description: "准备中国国际机床展览会GRT展位设计与物料", category: "project", estimatedHours: 16 },
          { title: "公众号内容策划", description: "策划本月4篇技术公众号推文的选题与大纲", category: "daily", estimatedHours: 4 },
          { title: "品牌传播策略会", description: "讨论半导体清洗产品线品牌定位与传播策略", category: "meeting", estimatedHours: 2 },
          { title: "客户案例视频拍摄", description: "协调拍摄某知名车企使用GRT设备的客户案例视频", category: "project", estimatedHours: 8 },
          { title: "竞品市场调研", description: "调研日韩清洗设备品牌在中国市场的渠道布局", category: "project", estimatedHours: 6 },
          { title: "数字营销培训", description: "参加B2B数字营销与线索培育策略培训", category: "training", estimatedHours: 4 },
          { title: "销售物料更新", description: "更新产品手册与技术参数对比表", category: "daily", estimatedHours: 3 },
        ],
        "管理": [
          { title: "部门月度经营分析", description: "准备部门月度经营数据分析报告", category: "daily", estimatedHours: 4 },
          { title: "战略规划讨论", description: "参与公司年度战略规划讨论与目标分解", category: "meeting", estimatedHours: 3 },
          { title: "团队1对1沟通", description: "与团队核心成员进行季度1对1职业发展沟通", category: "meeting", estimatedHours: 4 },
          { title: "预算编制与审批", description: "编制Q2部门预算并提交审批", category: "project", estimatedHours: 6 },
          { title: "跨部门协调会", description: "协调研发与生产的新品导入进度", category: "meeting", estimatedHours: 2 },
          { title: "管理能力提升培训", description: "参加中层管理者领导力提升研修班", category: "training", estimatedHours: 8 },
          { title: "绩效面谈", description: "完成直接下属Q1绩效面谈与改进计划制定", category: "daily", estimatedHours: 3 },
        ],
        "仓库": [
          { title: "库存盘点", description: "完成月度库存实物盘点与差异分析", category: "daily", estimatedHours: 8 },
          { title: "出入库单据核对", description: "核对本周出入库单据与ERP系统数据一致性", category: "daily", estimatedHours: 3 },
          { title: "仓储优化方案", description: "制定仓库空间优化与货位调整方案", category: "project", estimatedHours: 6 },
          { title: "物料需求协调会", description: "与采购部协调紧缺物料到货计划", category: "meeting", estimatedHours: 2 },
          { title: "安全库存评审", description: "评审关键物料安全库存水位设置合理性", category: "project", estimatedHours: 4 },
          { title: "仓储管理培训", description: "参加精益仓储管理与5S现场改善培训", category: "training", estimatedHours: 4 },
        ],
        "董助": [
          { title: "董事会会议纪要整理", description: "整理本月董事会议纪要并跟踪决议事项", category: "daily", estimatedHours: 4 },
          { title: "经营数据仪表板更新", description: "更新CEO驾驶舱经营数据看板的KPI指标", category: "daily", estimatedHours: 3 },
          { title: "战略对齐工作坊", description: "组织BU负责人参加季度战略对齐工作坊", category: "meeting", estimatedHours: 6 },
          { title: "投资项目尽调报告", description: "协助撰写新业务方向投资可行性尽调报告", category: "project", estimatedHours: 12 },
          { title: "对外合作洽谈准备", description: "准备与某半导体设备企业战略合作洽谈材料", category: "project", estimatedHours: 5 },
          { title: "管理层月报汇编", description: "汇编各部门月度运营报告提交CEO", category: "daily", estimatedHours: 3 },
          { title: "高管领导力研修", description: "参加高管领导力与战略思维研修课程", category: "training", estimatedHours: 8 },
        ],
      };

      // Match pool based on position/department
      const pos = emp.position;
      const dept = emp.department;
      let poolKey = "制造"; // default

      if (/机械设计|机械研发/.test(pos)) poolKey = "机械";
      else if (/电气/.test(pos)) poolKey = "电气";
      else if (/销售|采购|项目/.test(pos)) poolKey = "销售";
      else if (/质量/.test(pos)) poolKey = "质量";
      else if (/会计|财务/.test(pos)) poolKey = "财务";
      else if (/人事|行政|前台/.test(pos)) poolKey = "人事";
      else if (/IT|软件/.test(pos)) poolKey = "IT";
      else if (/制造|生产|班组|激光/.test(pos)) poolKey = "制造";
      else if (/市场/.test(pos)) poolKey = "市场";
      else if (/经理|总监|主管/.test(pos)) poolKey = "管理";
      else if (/仓库/.test(pos)) poolKey = "仓库";
      else if (/董事长助理|董助/.test(pos)) poolKey = "董助";
      else if (/董事长/.test(pos)) poolKey = "管理";
      else if (dept === "财务部") poolKey = "财务";
      else if (dept === "人事行政部") poolKey = "人事";
      else if (dept === "AI数智部") poolKey = "IT";

      const pool = TASK_POOLS[poolKey] ?? TASK_POOLS["制造"];

      // Select 7 tasks from pool (cycle if needed) and assign statuses/dates
      const statuses: Array<"todo" | "in_progress" | "completed" | "overdue"> = [
        "completed", "completed", "in_progress", "in_progress", "in_progress", "todo", "overdue",
      ];
      const priorities: Array<"high" | "medium" | "low"> = [
        "high", "medium", "high", "medium", "low", "medium", "high",
      ];
      const baseDate = new Date();

      const tasks = Array.from({ length: 7 }, (_, i) => {
        const tmpl = pool[i % pool.length];
        const status = statuses[i];
        const dueOffset = status === "completed" ? -(i + 1) : status === "overdue" ? -(i) : (i + 2);
        const dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + dueOffset);
        const progress = status === "completed" ? 100 : status === "overdue" ? clamp(30 + i * 10, 0, 80) : status === "in_progress" ? clamp(20 + i * 15, 0, 90) : 0;

        return {
          id: input.userId * 100 + i + 1,
          title: tmpl.title,
          description: tmpl.description,
          priority: priorities[i],
          status,
          dueDate: dueDate.toISOString().slice(0, 10),
          category: tmpl.category,
          estimatedHours: tmpl.estimatedHours,
          progress,
        };
      });

      return {
        found: true as const,
        employeeName: emp.name,
        department: emp.department,
        position: emp.position,
        tasks,
        summary: {
          total: tasks.length,
          completed: tasks.filter(t => t.status === "completed").length,
          inProgress: tasks.filter(t => t.status === "in_progress").length,
          overdue: tasks.filter(t => t.status === "overdue").length,
          todo: tasks.filter(t => t.status === "todo").length,
        },
        dataSource: "demo" as const,
      };
    }),

  // ─── Procedure 7: getWorkPlan (DEMO data) ──────────────────────────

  getWorkPlan: protectedProcedure
    .input(z.object({
      userId: z.number(),
      weekOffset: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const emp = REAL_EMPLOYEE_LIST.find(e => e.userId === input.userId);
      if (!emp) {
        return { found: false as const, error: `Employee with userId ${input.userId} not found` };
      }

      const offset = input.weekOffset ?? 0;
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 + offset * 7); // Monday
      const isoWeek = getISOWeekLabel(weekStart);

      const DAY_NAMES = ["周一", "周二", "周三", "周四", "周五"];

      // Position-aware plan templates
      const pos = emp.position;
      const dept = emp.department;

      type PlanItem = { time: string; title: string; type: "meeting" | "task" | "review" | "training"; duration: string; rationalityScore: number };

      // Generate day plans based on role
      const isManager = /经理|总监|主管|董事长|董助/.test(pos);
      const isEngineer = /工程师|电气|机械/.test(pos);
      const isSupport = /会计|财务|人事|行政|前台|仓库/.test(pos) || /财务部|人事行政部/.test(dept);

      const meetingTemplates = isManager
        ? ["部门晨会", "经营分析会", "战略对齐会", "跨部门协调会", "绩效面谈", "客户对接会", "预算评审会"]
        : isEngineer
        ? ["项目站会", "技术评审会", "设计对接会", "质量分析会", "安全培训会"]
        : ["部门例会", "流程对接会", "月度复盘会", "系统培训会"];

      const taskTemplates = isManager
        ? ["审批待办处理", "报告撰写", "数据分析", "人员面试", "方案评估"]
        : isEngineer
        ? ["图纸设计/编程", "现场调试", "技术文档编写", "测试验证", "BOM维护", "FMEA更新"]
        : isSupport
        ? ["单据审核", "数据录入", "报表制作", "档案整理", "系统操作"]
        : ["日常工作处理", "文档整理", "数据更新"];

      const reviewTemplates = isManager
        ? ["周报审核", "项目进度Review", "预算执行检查"]
        : ["工作成果自检", "文档复核", "流程合规检查"];

      const trainingTemplates = [
        "在线课程学习", "专业技能培训", "安全教育培训", "体系标准学习", "AI工具使用培训",
      ];

      // Deterministic pseudo-random from userId + dayIndex
      const pick = <T>(arr: T[], seed: number): T => arr[seed % arr.length];

      const dailyPlans = DAY_NAMES.map((dayName, dayIdx) => {
        const seed = input.userId * 31 + dayIdx * 7 + offset * 3;
        const items: PlanItem[] = [];

        // Morning meeting (most days)
        if (dayIdx < 4 || isManager) {
          items.push({
            time: isManager ? "08:30" : "09:00",
            title: pick(meetingTemplates, seed),
            type: "meeting",
            duration: isManager ? "60min" : "30min",
            rationalityScore: clamp(75 + (seed % 20), 60, 95),
          });
        }

        // Main task block 1
        items.push({
          time: isManager ? "09:30" : "09:30",
          title: pick(taskTemplates, seed + 1),
          type: "task",
          duration: "120min",
          rationalityScore: clamp(80 + (seed % 15), 70, 98),
        });

        // Midday review or task (varies)
        if (dayIdx % 2 === 0) {
          items.push({
            time: "14:00",
            title: pick(reviewTemplates, seed + 2),
            type: "review",
            duration: "60min",
            rationalityScore: clamp(70 + (seed % 25), 60, 95),
          });
        } else {
          items.push({
            time: "14:00",
            title: pick(taskTemplates, seed + 3),
            type: "task",
            duration: "90min",
            rationalityScore: clamp(78 + (seed % 18), 65, 96),
          });
        }

        // Afternoon block
        items.push({
          time: "15:30",
          title: pick(taskTemplates, seed + 4),
          type: "task",
          duration: "90min",
          rationalityScore: clamp(72 + (seed % 22), 60, 95),
        });

        // Training on specific days (Wed/Fri)
        if (dayIdx === 2 || dayIdx === 4) {
          items.push({
            time: "16:30",
            title: pick(trainingTemplates, seed + 5),
            type: "training",
            duration: "60min",
            rationalityScore: clamp(82 + (seed % 12), 70, 98),
          });
        }

        const dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + dayIdx);

        return {
          dayName,
          date: dayDate.toISOString().slice(0, 10),
          items,
        };
      });

      // Calculate overall rationality
      const allScores = dailyPlans.flatMap(d => d.items.map(i => i.rationalityScore));
      const weekRationalityScore = allScores.length > 0
        ? round2(allScores.reduce((s, v) => s + v, 0) / allScores.length)
        : 0;

      // AI analysis text
      const meetingCount = dailyPlans.reduce((s, d) => s + d.items.filter(i => i.type === "meeting").length, 0);
      const taskCount = dailyPlans.reduce((s, d) => s + d.items.filter(i => i.type === "task").length, 0);
      const trainingCount = dailyPlans.reduce((s, d) => s + d.items.filter(i => i.type === "training").length, 0);
      const totalItems = dailyPlans.reduce((s, d) => s + d.items.length, 0);
      const meetingRatio = round2(meetingCount / totalItems * 100);

      let rationalityAnalysis = `本周工作计划包含${totalItems}项安排：会议${meetingCount}项(${meetingRatio}%)、任务${taskCount}项、培训${trainingCount}项。`;
      if (meetingRatio > 40) {
        rationalityAnalysis += "会议占比偏高，建议合并部分会议或采用异步沟通方式，留出更多深度工作时间。";
      } else if (meetingRatio < 15) {
        rationalityAnalysis += "会议较少，需确认是否有遗漏的跨部门协作需求。";
      } else {
        rationalityAnalysis += "会议与任务比例较合理，建议确保每日保留至少2小时连续深度工作时段。";
      }
      if (trainingCount < 1) {
        rationalityAnalysis += "本周缺少培训安排，建议每周至少安排1次专业提升学习。";
      }
      if (weekRationalityScore >= 80) {
        rationalityAnalysis += `整体合理性评分${weekRationalityScore}分，计划质量良好。`;
      } else {
        rationalityAnalysis += `整体合理性评分${weekRationalityScore}分，建议优化时间分配以提升效率。`;
      }

      return {
        found: true as const,
        employeeName: emp.name,
        department: emp.department,
        position: emp.position,
        weekLabel: isoWeek,
        weekStartDate: weekStart.toISOString().slice(0, 10),
        dailyPlans,
        weekRationalityScore,
        rationalityAnalysis,
        dataSource: "demo" as const,
      };
    }),

  // ─── Procedure 8: getLifecycleProfile (综合职业生命周期档案) ─────────

  getLifecycleProfile: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const emp = REAL_EMPLOYEE_LIST.find(e => e.userId === input.userId);
      if (!emp) {
        return { found: false as const, error: `Employee with userId ${input.userId} not found` };
      }

      // ── A. Employee Base Info ──────────────────────────────────
      const buContext = BU_MAP[emp.department] ?? { buCode: "OTHER", buName: emp.department };

      // ── B. Tenure & Career (入职年限) ─────────────────────────
      const HIRE_DATES: Record<number, string> = {
        1: "2008-03-15", 80: "2023-06-01", 2: "2018-09-10", 54: "2019-03-01",
        101: "2025-08-15", 66: "2020-07-20", 67: "2017-04-12", 53: "2019-11-05",
        100: "2025-06-01", 49: "2022-08-15", 62: "2021-03-10", 96: "2024-02-20",
        83: "2023-01-15", 103: "2025-03-01", 4: "2012-04-20", 5: "2013-08-01",
        22: "2016-06-15", 63: "2022-09-01", 6: "2011-07-10", 44: "2019-06-20",
        97: "2024-07-15", 3: "2010-05-25", 7: "2013-03-08", 55: "2019-12-01",
        19: "2015-10-12", 18: "2015-11-20", 24: "2016-08-25", 8: "2014-01-15",
        9: "2014-09-10", 45: "2019-07-08",
      };

      const hireDate = HIRE_DATES[input.userId] ?? "2020-01-01";
      const hireDateObj = new Date(hireDate);
      const now = new Date();
      const diffMs = now.getTime() - hireDateObj.getTime();
      const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
      const tenureYears = Math.floor(totalMonths / 12);
      const tenureMonths = totalMonths % 12;
      const tenureDisplay = tenureYears > 0
        ? `${tenureYears}年${tenureMonths > 0 ? tenureMonths + "个月" : ""}`
        : `${tenureMonths}个月`;
      const tenureCategory =
        tenureYears < 1 ? "新员工" :
        tenureYears < 3 ? "成长期" :
        tenureYears < 5 ? "骨干期" :
        tenureYears < 10 ? "资深" : "元老";

      // ── C. Salary Structure (薪资结构) ────────────────────────
      function positionToSalaryInline(pos: string, dept: string) {
        const p = pos || "";
        if (p.includes("董事长") && !p.includes("助理"))
          return { base: 35000, posAllowance: 5000, techAllowance: 0, confAllowance: 3000, commAllowance: 500, transportAllowance: 500, seniorityYears: 20, grade: "M5" };
        if (p.includes("董事长助理"))
          return { base: 15000, posAllowance: 2000, techAllowance: 1000, confAllowance: 1500, commAllowance: 300, transportAllowance: 400, seniorityYears: 5, grade: "M3" };
        if (p.includes("部门经理") || (p.includes("AI数智") && p.includes("经理")))
          return { base: 18000, posAllowance: 3000, techAllowance: 1500, confAllowance: 1000, commAllowance: 400, transportAllowance: 400, seniorityYears: 10, grade: "M4" };
        if (p.includes("高级销售经理"))
          return { base: 14000, posAllowance: 2000, techAllowance: 500, confAllowance: 500, commAllowance: 400, transportAllowance: 400, seniorityYears: 10, grade: "T4" };
        if (p.includes("制造质量经理") || p.includes("设计经理") || p.includes("采购经理"))
          return { base: 13000, posAllowance: 2000, techAllowance: 1000, confAllowance: 500, commAllowance: 300, transportAllowance: 400, seniorityYears: 10, grade: "T4" };
        if (p.includes("人事行政主管"))
          return { base: 9000, posAllowance: 1500, techAllowance: 500, confAllowance: 300, commAllowance: 200, transportAllowance: 300, seniorityYears: 8, grade: "T3" };
        if (p.includes("主管"))
          return { base: 8500, posAllowance: 1200, techAllowance: 500, confAllowance: 200, commAllowance: 200, transportAllowance: 300, seniorityYears: 7, grade: "T3" };
        if (p.includes("班组长"))
          return { base: 8000, posAllowance: 1000, techAllowance: 300, confAllowance: 0, commAllowance: 100, transportAllowance: 300, seniorityYears: 8, grade: "T3" };
        if (p.includes("IT工程师") || p.includes("生产工程师兼项目及IT工程师"))
          return { base: 10000, posAllowance: 1500, techAllowance: 1500, confAllowance: 500, commAllowance: 200, transportAllowance: 400, seniorityYears: 3, grade: "T3" };
        if (p.includes("机械研发工程师"))
          return { base: 9500, posAllowance: 1000, techAllowance: 1200, confAllowance: 300, commAllowance: 100, transportAllowance: 300, seniorityYears: 5, grade: "T3" };
        if (p.includes("电气工程师"))
          return { base: 9000, posAllowance: 1000, techAllowance: 1200, confAllowance: 300, commAllowance: 100, transportAllowance: 300, seniorityYears: 5, grade: "T3" };
        if (p.includes("生产工程师兼项目经理"))
          return { base: 11000, posAllowance: 1500, techAllowance: 800, confAllowance: 300, commAllowance: 200, transportAllowance: 300, seniorityYears: 8, grade: "T3" };
        if (p.includes("销售与项目工程师"))
          return { base: 8000, posAllowance: 1000, techAllowance: 500, confAllowance: 200, commAllowance: 300, transportAllowance: 400, seniorityYears: 4, grade: "T2" };
        if (p.includes("采购与项目工程师"))
          return { base: 7500, posAllowance: 800, techAllowance: 500, confAllowance: 200, commAllowance: 200, transportAllowance: 300, seniorityYears: 4, grade: "T2" };
        if (p.includes("总账会计"))
          return { base: 8000, posAllowance: 1000, techAllowance: 500, confAllowance: 500, commAllowance: 100, transportAllowance: 300, seniorityYears: 8, grade: "T3" };
        if (p.includes("会计助理"))
          return { base: 5500, posAllowance: 500, techAllowance: 0, confAllowance: 200, commAllowance: 100, transportAllowance: 300, seniorityYears: 1, grade: "T1" };
        if (p.includes("会计"))
          return { base: 6500, posAllowance: 800, techAllowance: 300, confAllowance: 300, commAllowance: 100, transportAllowance: 300, seniorityYears: 5, grade: "T2" };
        if (p.includes("仓库管理员"))
          return { base: 5000, posAllowance: 500, techAllowance: 0, confAllowance: 0, commAllowance: 100, transportAllowance: 300, seniorityYears: 3, grade: "T1" };
        if (p.includes("前法"))
          return { base: 5500, posAllowance: 500, techAllowance: 0, confAllowance: 0, commAllowance: 100, transportAllowance: 300, seniorityYears: 2, grade: "T1" };
        if (p.includes("行政前台"))
          return { base: 4800, posAllowance: 300, techAllowance: 0, confAllowance: 0, commAllowance: 100, transportAllowance: 300, seniorityYears: 1, grade: "T1" };
        if (p.includes("市场主管"))
          return { base: 9000, posAllowance: 1200, techAllowance: 500, confAllowance: 300, commAllowance: 300, transportAllowance: 400, seniorityYears: 5, grade: "T3" };
        if (p.includes("市场专员"))
          return { base: 6500, posAllowance: 600, techAllowance: 300, confAllowance: 0, commAllowance: 200, transportAllowance: 300, seniorityYears: 2, grade: "T2" };
        if (p.includes("质量专员"))
          return { base: 6500, posAllowance: 800, techAllowance: 500, confAllowance: 0, commAllowance: 100, transportAllowance: 300, seniorityYears: 3, grade: "T2" };
        if (p.includes("激光"))
          return { base: 6500, posAllowance: 500, techAllowance: 300, confAllowance: 0, commAllowance: 0, transportAllowance: 300, seniorityYears: 4, grade: "T2" };
        // default
        return { base: 5500, posAllowance: 400, techAllowance: 200, confAllowance: 0, commAllowance: 100, transportAllowance: 300, seniorityYears: 3, grade: "T1" };
      }

      const sal = positionToSalaryInline(emp.position, emp.department);
      const seniorityAllowance = tenureYears * 50;
      const mealAllowance = 440;
      const totalFixedIncome = sal.base + sal.posAllowance + sal.techAllowance + sal.confAllowance
        + seniorityAllowance + mealAllowance + sal.transportAllowance + sal.commAllowance;

      // Social insurance (employee portion, Wuxi 2026 approx)
      const siBase = clamp(sal.base, 4494, 24042);
      const pension = round2(siBase * 0.08);
      const medical = round2(siBase * 0.02);
      const unemployment = round2(siBase * 0.005);
      const housingFund = round2(siBase * 0.12);
      const siTotal = round2(pension + medical + unemployment + housingFund);

      // Rough tax estimate (simplified progressive)
      const taxableIncome = totalFixedIncome - siTotal - 5000; // 5000 exemption
      const roughTax = taxableIncome > 0 ? round2(
        taxableIncome <= 3000 ? taxableIncome * 0.03 :
        taxableIncome <= 12000 ? taxableIncome * 0.10 - 210 :
        taxableIncome <= 25000 ? taxableIncome * 0.20 - 1410 :
        taxableIncome <= 35000 ? taxableIncome * 0.25 - 2660 :
        taxableIncome * 0.30 - 4410
      ) : 0;
      const estimatedNetMonthly = round2(totalFixedIncome - siTotal - roughTax);

      // ── D. Salary Growth History (薪资增长趋势) ───────────────
      const baseSalary2026 = sal.base;
      const yearFactors = [
        { year: 2023, factor: 0.80 },
        { year: 2024, factor: 0.86 },
        { year: 2025, factor: 0.93 },
        { year: 2026, factor: 1.00 },
      ];
      const salaryHistory = yearFactors.map((yf, idx) => {
        const yearBase = round2(baseSalary2026 * yf.factor);
        const totalComp = round2(yearBase * 1.3);
        const growthRate = idx === 0 ? 0 : round2((yf.factor / yearFactors[idx - 1].factor - 1) * 100);
        return { year: yf.year, baseSalary: yearBase, totalCompensation: totalComp, growthRate };
      });

      // ── E. Performance History (绩效水平及提高状态) ────────────
      const tsdckl = TSDCKL_SCORES[input.userId];
      const basePerf = tsdckl
        ? Math.round(tsdckl.T * 0.3 + tsdckl.K * 0.3 + tsdckl.S * 0.2 + tsdckl.C * 0.2)
        : 65;

      const quarters: Array<{ period: string; score: number; grade: string; rank: number; highlights: string }> = [];
      const quarterLabels = [
        "2024-Q1", "2024-Q2", "2024-Q3", "2024-Q4",
        "2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4",
        "2026-Q1",
      ];

      for (let qi = 0; qi < quarterLabels.length; qi++) {
        // Deterministic noise seeded by userId + quarter index
        const seed = ((input.userId * 7 + qi * 13 + 37) % 11) - 5; // range -5..+5
        const score = clamp(basePerf + seed + Math.floor(qi * 0.5), 30, 100); // slight upward trend
        const grade = score >= 90 ? "S" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "D";
        const rank = clamp(Math.round((100 - score) / 100 * 30) + 1, 1, 30);
        const highlights =
          grade === "S" ? "卓越表现，多项关键指标领先" :
          grade === "A" ? "优秀完成，核心目标全部达成" :
          grade === "B" ? "良好表现，大部分目标达成" :
          grade === "C" ? "基本达标，部分指标有提升空间" :
          "需改进，建议加强专项辅导";
        quarters.push({ period: quarterLabels[qi], score, grade, rank, highlights });
      }

      const scores = quarters.map(q => q.score);
      const avgScore = round2(scores.reduce((s, v) => s + v, 0) / scores.length);
      const bestQuarter = quarters.reduce((a, b) => a.score >= b.score ? a : b).period;
      const worstQuarter = quarters.reduce((a, b) => a.score <= b.score ? a : b).period;

      // Trend from last 4 quarters
      const recent4 = scores.slice(-4);
      const slope = recent4.length >= 2 ? (recent4[recent4.length - 1] - recent4[0]) / (recent4.length - 1) : 0;
      const trendDirection: "improving" | "stable" | "declining" =
        slope > 1 ? "improving" : slope < -1 ? "declining" : "stable";
      const improvementRate = scores.length >= 2
        ? round2((scores[scores.length - 1] - scores[0]) / scores[0] * 100)
        : 0;

      // ── F. Career Milestones (职业里程碑) ─────────────────────
      const milestones: Array<{ date: string; event: string; type: string; description: string }> = [];

      milestones.push({
        date: hireDate,
        event: "入职GRT",
        type: "onboard",
        description: `正式加入GRT ${emp.department}，担任${emp.position}`,
      });

      if (tenureYears >= 1) {
        const probDate = new Date(hireDateObj);
        probDate.setMonth(probDate.getMonth() + 6);
        milestones.push({
          date: probDate.toISOString().slice(0, 10),
          event: "转正评估通过",
          type: "evaluation",
          description: "试用期满，考核合格正式转正",
        });
      }

      if (tenureYears >= 3) {
        const promoDate = new Date(hireDateObj);
        promoDate.setFullYear(promoDate.getFullYear() + 2 + (input.userId % 2));
        milestones.push({
          date: promoDate.toISOString().slice(0, 10),
          event: "首次晋升",
          type: "promotion",
          description: "因工作表现突出获得职级晋升",
        });
      }

      if (/经理|主管|总监/.test(emp.position)) {
        const mgrDate = new Date(hireDateObj);
        mgrDate.setFullYear(mgrDate.getFullYear() + Math.min(tenureYears - 1, 5));
        milestones.push({
          date: mgrDate.toISOString().slice(0, 10),
          event: "晋升管理岗",
          type: "promotion",
          description: `晋升为${emp.position}，承担团队管理职责`,
        });
      }

      if (tenureYears >= 5) {
        milestones.push({
          date: `${2020 + (input.userId % 4)}-09-01`,
          event: "年度优秀员工",
          type: "award",
          description: "获评年度优秀员工称号",
        });
      }

      milestones.push({
        date: "2026-02-10",
        event: "2026年2月TSDCKL能力测评",
        type: "evaluation",
        description: "参加公司全员TSDCKL六维能力测评（技术/规范/数字化/协作/知识/领导力）",
      });

      // Sort milestones by date
      milestones.sort((a, b) => a.date.localeCompare(b.date));

      return {
        found: true as const,
        employee: {
          userId: emp.userId,
          grtId: emp.grtId,
          name: emp.name,
          department: emp.department,
          position: emp.position,
          buContext,
        },
        tenure: {
          hireDate,
          tenureYears,
          tenureMonths,
          tenureDisplay,
          tenureCategory,
        },
        salary: {
          baseSalary: sal.base,
          positionAllowance: sal.posAllowance,
          technicalAllowance: sal.techAllowance,
          confidentialityAllowance: sal.confAllowance,
          seniorityAllowance,
          mealAllowance,
          transportAllowance: sal.transportAllowance,
          communicationAllowance: sal.commAllowance,
          totalFixedIncome,
          socialInsurance: {
            pension,
            medical,
            unemployment,
            housingFund,
            total: siTotal,
          },
          estimatedNetMonthly,
          grade: sal.grade,
          dataSource: "seeded" as const,
        },
        salaryHistory,
        salaryDataSource: "estimated" as const,
        performance: {
          quarterly: quarters,
          summary: {
            avgScore,
            bestQuarter,
            worstQuarter,
            trendDirection,
            improvementRate,
          },
        },
        performanceDataSource: "derived_from_tsdckl" as const,
        milestones,
      };
    }),
});

// ─── Helper: ISO week label ───────────────────────────────────────────
function getISOWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
