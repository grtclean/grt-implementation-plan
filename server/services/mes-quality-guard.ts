/**
 * MES Quality Guard — AI Skill Intercept Engine
 * IATF 16949 §7.2 Competence verification for shopfloor stations
 */
import pg from "pg";

// Custom error class
export class InsufficientSkillError extends Error {
  public employeeId: number;
  public employeeName: string;
  public domain: string;
  public currentLevel: number;
  public requiredLevel: number;
  public iatfWarning: string;

  constructor(params: {
    employeeId: number;
    employeeName: string;
    domain: string;
    currentLevel: number;
    requiredLevel: number;
  }) {
    const iatfWarning = `[IATF 16949 §7.2 NON-CONFORMANCE] Employee "${params.employeeName}" (ID: ${params.employeeId}) has competence level L${params.currentLevel} in domain "${params.domain}", but station requires minimum L${params.requiredLevel}. Per IATF 16949 clause 7.2, organizations shall determine necessary competence of persons doing work that affects product quality. This worker MUST NOT perform this task until competence gap is closed through training, mentoring, or reassignment. Supervisor authorization required for override.`;

    super(iatfWarning);
    this.name = "InsufficientSkillError";
    this.employeeId = params.employeeId;
    this.employeeName = params.employeeName;
    this.domain = params.domain;
    this.currentLevel = params.currentLevel;
    this.requiredLevel = params.requiredLevel;
    this.iatfWarning = iatfWarning;
  }
}

// Score to level conversion (matches dashboard thresholds)
function scoreToLevel(score: string | null): number {
  if (!score) return 0;
  const num = parseFloat(score);
  if (isNaN(num)) return 0;
  if (num >= 90) return 5;
  if (num >= 75) return 4;
  if (num >= 60) return 3;
  if (num >= 40) return 2;
  return 1;
}

// Domain code to column name mapping
const DOMAIN_COLUMN_MAP: Record<string, string> = {
  T: "t_score",
  S: "s_score",
  D: "d_score",
  C: "c_score",
  K: "k_score",
  L: "l_score",
};

// The main verification function
export async function verifyWorkerSkillForStation(
  employeeId: number,
  requiredSkillCategory: string, // "T", "S", "D", "C", "K", or "L"
  requiredLevel: number // 1-5
): Promise<{
  passed: boolean;
  employeeId: number;
  employeeName: string;
  domain: string;
  currentLevel: number;
  requiredLevel: number;
  score: string;
}> {
  // Use requireDb from the project's db module
  const { requireDb } = await import("../db");
  const { sql } = await import("drizzle-orm");
  const db = await requireDb();

  // Look up the employee's assessment
  const column = DOMAIN_COLUMN_MAP[requiredSkillCategory.toUpperCase()];
  if (!column) {
    throw new Error(`Invalid skill category: ${requiredSkillCategory}. Must be one of T, S, D, C, K, L.`);
  }

  // Query the assessment - get the most recent one for this employee
  const result = await db.execute(sql`
    SELECT employee_id, employee_name, t_score, s_score, d_score, c_score, k_score, l_score
    FROM employee_competence_assessments
    WHERE employee_id = ${employeeId}
    ORDER BY assessed_at DESC
    LIMIT 1
  `);

  if (!result.rows || result.rows.length === 0) {
    throw new Error(`No competence assessment found for employee ID ${employeeId}. Cannot verify skill.`);
  }

  const row = result.rows[0] as Record<string, any>;
  const employeeName = row.employee_name || "Unknown";
  const scoreValue = row[column] as string | null;
  const currentLevel = scoreToLevel(scoreValue);

  if (currentLevel < requiredLevel) {
    throw new InsufficientSkillError({
      employeeId,
      employeeName,
      domain: requiredSkillCategory.toUpperCase(),
      currentLevel,
      requiredLevel,
    });
  }

  return {
    passed: true,
    employeeId,
    employeeName,
    domain: requiredSkillCategory.toUpperCase(),
    currentLevel,
    requiredLevel,
    score: scoreValue || "0",
  };
}
