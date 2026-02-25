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
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";

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

// ─── Mock Data (GRT Employees) ──────────────────────────────────────

interface MockEmployee {
  employee: EmployeeBase;
  kpiRecords: KpiRecord[];
  certificates: CertRecord[];
  meetingPerf: MeetingPerfRecord[];
  aiTasks: AiTaskRecord[];
}

const MOCK_EMPLOYEES: MockEmployee[] = [
  // ── USER-1001: Star performer (high across all dimensions) ──
  {
    employee: {
      userId: 1001, employeeCode: "GRT-E001", name: "张伟 (Zhang Wei)",
      department: "Engineering", position: "Senior Mechanical Engineer", level: "P6",
      hireDate: "2020-03-15",
    },
    kpiRecords: [
      { month: "2025-12", overallKpiScore: 92, reviewerComments: "Excellent project delivery" },
      { month: "2026-01", overallKpiScore: 88, reviewerComments: "Strong quarter-end performance" },
      { month: "2026-02", overallKpiScore: 95, reviewerComments: "Outstanding initiative on cost reduction" },
    ],
    certificates: [
      { certificateName: "ISO 9001 Internal Auditor", certificateLevel: "advanced", issueDate: "2024-06-01", expiryDate: "2027-06-01", isValid: true },
      { certificateName: "PLC Programming (Siemens S7)", certificateLevel: "expert", issueDate: "2023-09-01", expiryDate: "2026-09-01", isValid: true },
      { certificateName: "Lean Six Sigma Green Belt", certificateLevel: "intermediate", issueDate: "2025-03-01", expiryDate: "2028-03-01", isValid: true },
    ],
    meetingPerf: [
      { month: "2025-12", meetingScore: 88, totalScore: 85, breadthScore: 82, depthScore: 90, executionScore: 88, disciplineScore: 85, meetingsAttended: 12, meetingsTotal: 14, actionItemsCompleted: 8, actionItemsTotal: 9 },
      { month: "2026-01", meetingScore: 92, totalScore: 90, breadthScore: 88, depthScore: 92, executionScore: 90, disciplineScore: 88, meetingsAttended: 10, meetingsTotal: 11, actionItemsCompleted: 7, actionItemsTotal: 7 },
      { month: "2026-02", meetingScore: 90, totalScore: 88, breadthScore: 86, depthScore: 91, executionScore: 89, disciplineScore: 87, meetingsAttended: 8, meetingsTotal: 9, actionItemsCompleted: 6, actionItemsTotal: 6 },
    ],
    aiTasks: [
      { taskType: "document_draft", qualityScore: 88, durationMs: 45000, llmTokensUsed: 2400, status: "completed" },
      { taskType: "data_analysis", qualityScore: 92, durationMs: 30000, llmTokensUsed: 1800, status: "completed" },
      { taskType: "report_generation", qualityScore: 85, durationMs: 60000, llmTokensUsed: 3200, status: "completed" },
      { taskType: "code_review", qualityScore: 90, durationMs: 25000, llmTokensUsed: 1500, status: "completed" },
      { taskType: "risk_assessment", qualityScore: 87, durationMs: 55000, llmTokensUsed: 2800, status: "completed" },
      { taskType: "meeting_summary", qualityScore: 91, durationMs: 20000, llmTokensUsed: 1200, status: "completed" },
      { taskType: "email_draft", qualityScore: 86, durationMs: 15000, llmTokensUsed: 800, status: "completed" },
      { taskType: "data_analysis", qualityScore: 93, durationMs: 35000, llmTokensUsed: 2100, status: "completed" },
      { taskType: "document_draft", qualityScore: 89, durationMs: 40000, llmTokensUsed: 2200, status: "completed" },
      { taskType: "quality_inspection", qualityScore: 94, durationMs: 50000, llmTokensUsed: 2600, status: "completed" },
    ],
  },
  // ── USER-1002: New hire, low data ──
  {
    employee: {
      userId: 1002, employeeCode: "GRT-E042", name: "李明 (Li Ming)",
      department: "Quality", position: "Junior QC Inspector", level: "P2",
      hireDate: "2025-11-01",
    },
    kpiRecords: [
      { month: "2026-01", overallKpiScore: 68 },
      { month: "2026-02", overallKpiScore: 72 },
    ],
    certificates: [
      { certificateName: "IPC-A-610 Acceptability", certificateLevel: "basic", issueDate: "2025-12-01", expiryDate: "2028-12-01", isValid: true },
    ],
    meetingPerf: [
      { month: "2026-01", meetingScore: 55, totalScore: 50, breadthScore: 45, depthScore: 55, executionScore: 50, disciplineScore: 60, meetingsAttended: 4, meetingsTotal: 8, actionItemsCompleted: 2, actionItemsTotal: 4 },
      { month: "2026-02", meetingScore: 62, totalScore: 58, breadthScore: 52, depthScore: 60, executionScore: 58, disciplineScore: 65, meetingsAttended: 6, meetingsTotal: 9, actionItemsCompleted: 3, actionItemsTotal: 5 },
    ],
    aiTasks: [
      { taskType: "document_draft", qualityScore: 65, durationMs: 90000, llmTokensUsed: 4000, status: "completed" },
      { taskType: "data_analysis", qualityScore: 58, durationMs: 120000, llmTokensUsed: 5200, status: "failed" },
    ],
  },
  // ── USER-1003: AI power user with high meetings (Innovation > 90 target) ──
  {
    employee: {
      userId: 1003, employeeCode: "GRT-E018", name: "王芳 (Wang Fang)",
      department: "R&D", position: "Product Innovation Lead", level: "P7",
      hireDate: "2019-07-20",
    },
    kpiRecords: [
      { month: "2025-12", overallKpiScore: 82 },
      { month: "2026-01", overallKpiScore: 78 },
      { month: "2026-02", overallKpiScore: 85 },
    ],
    certificates: [
      { certificateName: "AWS Solutions Architect", certificateLevel: "expert", issueDate: "2024-01-15", expiryDate: "2027-01-15", isValid: true },
      { certificateName: "Certified ScrumMaster", certificateLevel: "intermediate", issueDate: "2023-06-01", expiryDate: "2026-06-01", isValid: true },
    ],
    meetingPerf: [
      { month: "2025-12", meetingScore: 85, totalScore: 82, breadthScore: 80, depthScore: 88, executionScore: 85, disciplineScore: 82, meetingsAttended: 15, meetingsTotal: 16, actionItemsCompleted: 10, actionItemsTotal: 11 },
      { month: "2026-01", meetingScore: 88, totalScore: 86, breadthScore: 84, depthScore: 90, executionScore: 87, disciplineScore: 85, meetingsAttended: 14, meetingsTotal: 15, actionItemsCompleted: 9, actionItemsTotal: 10 },
      { month: "2026-02", meetingScore: 92, totalScore: 90, breadthScore: 88, depthScore: 93, executionScore: 90, disciplineScore: 88, meetingsAttended: 12, meetingsTotal: 12, actionItemsCompleted: 8, actionItemsTotal: 8 },
    ],
    aiTasks: [
      { taskType: "data_analysis", qualityScore: 92, durationMs: 28000, llmTokensUsed: 1600, status: "completed" },
      { taskType: "report_generation", qualityScore: 88, durationMs: 45000, llmTokensUsed: 2400, status: "completed" },
      { taskType: "risk_assessment", qualityScore: 90, durationMs: 38000, llmTokensUsed: 2000, status: "completed" },
      { taskType: "code_review", qualityScore: 95, durationMs: 22000, llmTokensUsed: 1300, status: "completed" },
      { taskType: "meeting_summary", qualityScore: 91, durationMs: 18000, llmTokensUsed: 1100, status: "completed" },
      { taskType: "document_draft", qualityScore: 87, durationMs: 42000, llmTokensUsed: 2300, status: "completed" },
      { taskType: "data_analysis", qualityScore: 93, durationMs: 30000, llmTokensUsed: 1700, status: "completed" },
      { taskType: "quality_inspection", qualityScore: 89, durationMs: 48000, llmTokensUsed: 2500, status: "completed" },
      { taskType: "email_draft", qualityScore: 85, durationMs: 12000, llmTokensUsed: 700, status: "completed" },
      { taskType: "report_generation", qualityScore: 94, durationMs: 52000, llmTokensUsed: 2800, status: "completed" },
      { taskType: "data_analysis", qualityScore: 91, durationMs: 26000, llmTokensUsed: 1500, status: "completed" },
      { taskType: "risk_assessment", qualityScore: 96, durationMs: 40000, llmTokensUsed: 2100, status: "completed" },
    ],
  },
];

// ─── tRPC Router ─────────────────────────────────────────────────────

export const employeeProfileRouter = router({
  /**
   * getProfile — generate 360° profile for a specific user.
   * The core fusion: HR × KPI × Meetings × Certs × AI in one response.
   */
  getProfile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const mock = MOCK_EMPLOYEES.find(e => e.employee.userId === input.userId);
      if (!mock) {
        return { found: false as const, error: `Employee with userId ${input.userId} not found` };
      }
      const profile = generate360Profile(mock);
      return { found: true as const, profile, dataSource: "mock" as const };
    }),

  /**
   * listProfiles — returns all employees with their 360° profiles.
   * For the team overview / leaderboard view.
   */
  listProfiles: publicProcedure.query(async () => {
    const profiles = MOCK_EMPLOYEES.map(mock => generate360Profile(mock));

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
      dataSource: "mock" as const,
    };
  }),

  /**
   * getTeamRadar — aggregated radar for a department.
   */
  getTeamRadar: publicProcedure
    .input(z.object({ department: z.string().optional() }))
    .query(async ({ input }) => {
      const filtered = input.department
        ? MOCK_EMPLOYEES.filter(e => e.employee.department === input.department)
        : MOCK_EMPLOYEES;

      if (filtered.length === 0) {
        return { found: false as const, error: "No employees in department" };
      }

      const profiles = filtered.map(mock => generate360Profile(mock));
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
        dataSource: "mock" as const,
      };
    }),
});
