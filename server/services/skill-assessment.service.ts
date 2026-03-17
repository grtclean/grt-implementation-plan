/**
 * Skill Assessment Service — 岗位能力等级测评
 *
 * CEO指令: 给每个岗位创造可以测试能力等级专业程度，包括人为输入题目
 *
 * Features:
 * - Position skill profile management (22 position types)
 * - Question bank CRUD (system + manual entry by managers)
 * - Assessment paper composition (auto + manual)
 * - Test session management (start, answer, submit, grade)
 * - Auto-grading for objective questions
 * - Manual grading for subjective questions
 * - Skill level certification upon passing
 * - Integration with employee points system
 */

import { requireDb } from "../db";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import {
  skillPositionProfiles,
  skillQuestionBank,
  skillAssessmentPapers,
  skillAssessmentSessions,
  skillAssessmentAnswers,
  skillLevelCerts,
  skillLevelEnum,
  assessmentSessionStatusEnum,
  certStatusEnum,
} from "../../drizzle/skill-assessment-schema";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("skill-assessment");

// ── Pass thresholds ──────────────────────────────────────
const DEFAULT_THRESHOLDS: Record<string, number> = {
  L1: 60, L2: 70, L3: 80, L4: 85, L5: 90,
};

// ══════════════════════════════════════════════════════════
// 1. Position Profiles — 岗位能力模型
// ══════════════════════════════════════════════════════════

export async function listPositionProfiles(opts?: { department?: string; activeOnly?: boolean }) {
  const db = await requireDb();
  let query = db.select().from(skillPositionProfiles);
  if (opts?.department) {
    query = query.where(eq(skillPositionProfiles.department, opts.department)) as typeof query;
  }
  if (opts?.activeOnly !== false) {
    query = query.where(eq(skillPositionProfiles.isActive, true)) as typeof query;
  }
  return query.orderBy(skillPositionProfiles.positionName).limit(200);
}

export async function getPositionProfile(positionKey: string) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(skillPositionProfiles)
    .where(eq(skillPositionProfiles.positionKey, positionKey))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertPositionProfile(profile: {
  positionKey: string;
  positionName: string;
  positionNameEn?: string;
  department?: string;
  description?: string;
  skillDomains: Array<{ key: string; name: string; nameEn?: string; weight: number; description?: string }>;
  passThresholds?: Record<string, number>;
  timeLimitMinutes?: Record<string, number>;
  questionCount?: Record<string, number>;
  createdBy?: number;
}) {
  const db = await requireDb();
  const existing = await db
    .select({ id: skillPositionProfiles.id })
    .from(skillPositionProfiles)
    .where(eq(skillPositionProfiles.positionKey, profile.positionKey))
    .limit(1);

  if (existing.length > 0) {
    await db.update(skillPositionProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(skillPositionProfiles.positionKey, profile.positionKey));
  } else {
    await db.insert(skillPositionProfiles).values({
      ...profile,
      passThresholds: profile.passThresholds ?? DEFAULT_THRESHOLDS,
    });
  }
  log.info({ positionKey: profile.positionKey }, "upserted position profile");
  return { success: true, positionKey: profile.positionKey };
}

// ══════════════════════════════════════════════════════════
// 2. Question Bank — 题库 (含人工输入)
// ══════════════════════════════════════════════════════════

export async function listQuestions(opts: {
  positionKey: string;
  domainKey?: string;
  difficulty?: string;
  targetLevel?: string;
  questionType?: string;
  manualOnly?: boolean;
  limit?: number;
}) {
  const db = await requireDb();
  const limit = Math.min(opts.limit ?? 200, 500);
  const conditions: ReturnType<typeof eq>[] = [
    eq(skillQuestionBank.positionKey, opts.positionKey),
    eq(skillQuestionBank.isActive, true),
  ];
  if (opts.domainKey) conditions.push(eq(skillQuestionBank.domainKey, opts.domainKey));
  if (opts.difficulty) conditions.push(eq(skillQuestionBank.difficulty, opts.difficulty as typeof skillQuestionBank.difficulty.enumValues[number]));
  if (opts.questionType) conditions.push(eq(skillQuestionBank.questionType, opts.questionType as typeof skillQuestionBank.questionType.enumValues[number]));
  if (opts.manualOnly) conditions.push(eq(skillQuestionBank.isManualEntry, true));

  let query = db.select().from(skillQuestionBank);
  for (const cond of conditions) {
    query = query.where(cond) as typeof query;
  }
  return query.orderBy(desc(skillQuestionBank.createdAt)).limit(limit);
}

export async function getQuestion(id: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(skillQuestionBank)
    .where(eq(skillQuestionBank.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** 人为输入题目 — Manager creates a question */
export async function createQuestion(input: {
  positionKey: string;
  domainKey: string;
  questionType: string;
  difficulty: string;
  targetLevels: string[];
  content: string;
  options?: Array<{ key: string; text: string; isCorrect?: boolean }>;
  correctAnswer?: string;
  explanation?: string;
  points?: number;
  tags?: string[];
  reference?: string;
  createdBy: number;
  createdByName?: string;
}) {
  const db = await requireDb();
  const rows = await db.insert(skillQuestionBank).values({
    ...input,
    questionType: input.questionType as typeof skillQuestionBank.questionType.enumValues[number],
    difficulty: input.difficulty as typeof skillQuestionBank.difficulty.enumValues[number],
    points: input.points ?? 1,
    isManualEntry: true,
  }).returning();
  log.info({ positionKey: input.positionKey, domainKey: input.domainKey, createdBy: input.createdBy }, "manual question created");
  return rows[0];
}

export async function updateQuestion(id: number, updates: {
  content?: string;
  options?: Array<{ key: string; text: string; isCorrect?: boolean }>;
  correctAnswer?: string;
  explanation?: string;
  points?: number;
  difficulty?: string;
  targetLevels?: string[];
  tags?: string[];
  reference?: string;
  isActive?: boolean;
}) {
  const db = await requireDb();
  await db.update(skillQuestionBank)
    .set({ ...updates, difficulty: updates.difficulty as typeof skillQuestionBank.difficulty.enumValues[number] | undefined, updatedAt: new Date() })
    .where(eq(skillQuestionBank.id, id));
  return { success: true };
}

export async function deleteQuestion(id: number) {
  const db = await requireDb();
  await db.update(skillQuestionBank)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(skillQuestionBank.id, id));
  return { success: true };
}

/** Batch import questions (人为输入批量) */
export async function batchImportQuestions(questions: Array<{
  positionKey: string;
  domainKey: string;
  questionType: string;
  difficulty: string;
  targetLevels: string[];
  content: string;
  options?: Array<{ key: string; text: string; isCorrect?: boolean }>;
  correctAnswer?: string;
  explanation?: string;
  points?: number;
  createdBy: number;
  createdByName?: string;
}>) {
  const db = await requireDb();
  let created = 0;
  for (const q of questions) {
    await db.insert(skillQuestionBank).values({
      ...q,
      questionType: q.questionType as typeof skillQuestionBank.questionType.enumValues[number],
      difficulty: q.difficulty as typeof skillQuestionBank.difficulty.enumValues[number],
      points: q.points ?? 1,
      isManualEntry: true,
    });
    created++;
  }
  log.info({ created, total: questions.length }, "batch imported questions");
  return { created };
}

/** Get question bank stats per position */
export async function getQuestionStats(positionKey: string) {
  const db = await requireDb();
  const rows = await db
    .select({
      difficulty: skillQuestionBank.difficulty,
      questionType: skillQuestionBank.questionType,
      count: sql<number>`count(*)::int`,
    })
    .from(skillQuestionBank)
    .where(and(
      eq(skillQuestionBank.positionKey, positionKey),
      eq(skillQuestionBank.isActive, true),
    ))
    .groupBy(skillQuestionBank.difficulty, skillQuestionBank.questionType)
    .limit(100);

  const totalRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(skillQuestionBank)
    .where(and(
      eq(skillQuestionBank.positionKey, positionKey),
      eq(skillQuestionBank.isActive, true),
    ))
    .limit(1);

  const manualRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(skillQuestionBank)
    .where(and(
      eq(skillQuestionBank.positionKey, positionKey),
      eq(skillQuestionBank.isActive, true),
      eq(skillQuestionBank.isManualEntry, true),
    ))
    .limit(1);

  return {
    total: totalRows[0]?.count ?? 0,
    manualEntries: manualRows[0]?.count ?? 0,
    byDifficultyAndType: rows,
  };
}

// ══════════════════════════════════════════════════════════
// 3. Assessment Papers — 试卷管理
// ══════════════════════════════════════════════════════════

export async function listPapers(opts?: { positionKey?: string; targetLevel?: string; publishedOnly?: boolean }) {
  const db = await requireDb();
  let query = db.select().from(skillAssessmentPapers);
  if (opts?.positionKey) query = query.where(eq(skillAssessmentPapers.positionKey, opts.positionKey)) as typeof query;
  if (opts?.targetLevel) query = query.where(eq(skillAssessmentPapers.targetLevel, opts.targetLevel as typeof skillAssessmentPapers.targetLevel.enumValues[number])) as typeof query;
  if (opts?.publishedOnly) query = query.where(eq(skillAssessmentPapers.isPublished, true)) as typeof query;
  return query.orderBy(desc(skillAssessmentPapers.createdAt)).limit(200);
}

export async function createPaper(input: {
  title: string;
  titleEn?: string;
  positionKey: string;
  targetLevel: string;
  totalPoints: number;
  passScore: number;
  timeLimitMinutes?: number;
  questionComposition: Array<{ questionId: number; points: number; order: number }>;
  domainWeights?: Record<string, number>;
  createdBy?: number;
}) {
  const db = await requireDb();
  const rows = await db.insert(skillAssessmentPapers).values({
    ...input,
    targetLevel: input.targetLevel as typeof skillAssessmentPapers.targetLevel.enumValues[number],
    timeLimitMinutes: input.timeLimitMinutes ?? 60,
  }).returning();
  log.info({ positionKey: input.positionKey, targetLevel: input.targetLevel }, "assessment paper created");
  return rows[0];
}

export async function publishPaper(id: number) {
  const db = await requireDb();
  await db.update(skillAssessmentPapers)
    .set({ isPublished: true, updatedAt: new Date() })
    .where(eq(skillAssessmentPapers.id, id));
  return { success: true };
}

// ══════════════════════════════════════════════════════════
// 4. Assessment Sessions — 考试管理
// ══════════════════════════════════════════════════════════

/** Start an assessment for an employee */
export async function startSession(employeeId: number, paperId: number) {
  const db = await requireDb();

  // Get paper details
  const papers = await db
    .select()
    .from(skillAssessmentPapers)
    .where(eq(skillAssessmentPapers.id, paperId))
    .limit(1);
  const paper = papers[0];
  if (!paper) throw new Error("Assessment paper not found");
  if (!paper.isPublished) throw new Error("Paper is not published");

  const expiresAt = new Date(Date.now() + paper.timeLimitMinutes * 60 * 1000);

  const rows = await db.insert(skillAssessmentSessions).values({
    employeeId,
    paperId,
    positionKey: paper.positionKey,
    targetLevel: paper.targetLevel,
    status: "in_progress" as typeof assessmentSessionStatusEnum.enumValues[number],
    startedAt: new Date(),
    expiresAt,
    totalPoints: paper.totalPoints,
  }).returning();

  // Pre-create answer slots
  const composition = paper.questionComposition as Array<{ questionId: number; points: number; order: number }>;
  for (const q of composition) {
    await db.insert(skillAssessmentAnswers).values({
      sessionId: rows[0].id,
      questionId: q.questionId,
      questionOrder: q.order,
      maxPoints: q.points,
    });
  }

  log.info({ employeeId, paperId, sessionId: rows[0].id }, "assessment session started");
  return rows[0];
}

/** Submit an answer for a question in a session */
export async function submitAnswer(sessionId: number, questionId: number, answer: {
  answer?: string;
  selectedOptions?: string[];
}) {
  const db = await requireDb();

  // Get the question for auto-grading
  const questions = await db
    .select()
    .from(skillQuestionBank)
    .where(eq(skillQuestionBank.id, questionId))
    .limit(1);
  const question = questions[0];
  if (!question) throw new Error("Question not found");

  // Auto-grade objective questions
  let isCorrect: boolean | null = null;
  let pointsEarned: number | null = null;

  const answerRows = await db
    .select({ maxPoints: skillAssessmentAnswers.maxPoints })
    .from(skillAssessmentAnswers)
    .where(and(
      eq(skillAssessmentAnswers.sessionId, sessionId),
      eq(skillAssessmentAnswers.questionId, questionId),
    ))
    .limit(1);
  const maxPoints = answerRows[0]?.maxPoints ?? question.points;

  if (["single_choice", "multi_choice", "true_false"].includes(question.questionType)) {
    const correctAnswer = question.correctAnswer;
    if (correctAnswer && answer.selectedOptions) {
      const sortedAnswer = [...answer.selectedOptions].sort().join(",");
      const sortedCorrect = correctAnswer.split(",").sort().join(",");
      isCorrect = sortedAnswer === sortedCorrect;
      pointsEarned = isCorrect ? maxPoints : 0;
    }
  } else if (question.questionType === "fill_blank" && question.correctAnswer) {
    isCorrect = answer.answer?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    pointsEarned = isCorrect ? maxPoints : 0;
  }
  // short_answer, practical, case_analysis → needs manual grading

  await db.update(skillAssessmentAnswers)
    .set({
      answer: answer.answer,
      selectedOptions: answer.selectedOptions,
      isCorrect,
      pointsEarned,
    })
    .where(and(
      eq(skillAssessmentAnswers.sessionId, sessionId),
      eq(skillAssessmentAnswers.questionId, questionId),
    ));

  // Update question usage stats
  await db.update(skillQuestionBank)
    .set({ usageCount: sql`${skillQuestionBank.usageCount} + 1` })
    .where(eq(skillQuestionBank.id, questionId));

  return { questionId, isCorrect, pointsEarned };
}

/** Submit entire session (finalize all answers) */
export async function submitSession(sessionId: number) {
  const db = await requireDb();

  // Calculate auto-graded score
  const answers = await db
    .select()
    .from(skillAssessmentAnswers)
    .where(eq(skillAssessmentAnswers.sessionId, sessionId))
    .limit(500);

  const autoEarned = answers.reduce((sum, a) => sum + (a.pointsEarned ?? 0), 0);
  const hasSubjective = answers.some(a => a.isCorrect === null && a.answer);

  const status = hasSubjective ? "grading" : "completed";

  // Get total points
  const sessions = await db
    .select()
    .from(skillAssessmentSessions)
    .where(eq(skillAssessmentSessions.id, sessionId))
    .limit(1);
  const session = sessions[0];
  if (!session) throw new Error("Session not found");

  const totalPoints = session.totalPoints ?? 100;
  const finalScore = hasSubjective ? null : ((autoEarned / totalPoints) * 100);

  // Determine pass/fail (only if fully graded)
  let passed: boolean | null = null;
  if (!hasSubjective) {
    const profile = await db
      .select({ passThresholds: skillPositionProfiles.passThresholds })
      .from(skillPositionProfiles)
      .where(eq(skillPositionProfiles.positionKey, session.positionKey))
      .limit(1);
    const thresholds = (profile[0]?.passThresholds as Record<string, number>) ?? DEFAULT_THRESHOLDS;
    const requiredScore = thresholds[session.targetLevel] ?? 60;
    passed = (finalScore ?? 0) >= requiredScore;
  }

  await db.update(skillAssessmentSessions)
    .set({
      status: status as typeof assessmentSessionStatusEnum.enumValues[number],
      submittedAt: new Date(),
      earnedPoints: autoEarned,
      finalScore: finalScore?.toFixed(2),
      passed,
      completedAt: hasSubjective ? null : new Date(),
    })
    .where(eq(skillAssessmentSessions.id, sessionId));

  // If passed and fully graded, issue certificate
  if (passed) {
    await issueCertificate(session.employeeId, session.positionKey, session.targetLevel, sessionId, finalScore!);
  }

  log.info({ sessionId, status, autoEarned, finalScore, passed }, "session submitted");
  return { sessionId, status, earnedPoints: autoEarned, finalScore, passed };
}

/** Manual grading for subjective questions */
export async function gradeAnswer(answerId: number, grading: {
  manualScore: number;
  manualFeedback?: string;
  gradedBy: number;
}) {
  const db = await requireDb();
  await db.update(skillAssessmentAnswers)
    .set({
      manualScore: grading.manualScore,
      pointsEarned: grading.manualScore,
      manualFeedback: grading.manualFeedback,
      gradedBy: grading.gradedBy,
    })
    .where(eq(skillAssessmentAnswers.id, answerId));
  return { success: true };
}

/** Complete grading for a session (after all subjective Qs graded) */
export async function completeGrading(sessionId: number, gradedBy: number) {
  const db = await requireDb();

  const answers = await db
    .select()
    .from(skillAssessmentAnswers)
    .where(eq(skillAssessmentAnswers.sessionId, sessionId))
    .limit(500);

  const totalEarned = answers.reduce((sum, a) => sum + (a.pointsEarned ?? a.manualScore ?? 0), 0);
  const manualPortion = answers.reduce((sum, a) => sum + (a.manualScore ?? 0), 0);

  const sessions = await db
    .select()
    .from(skillAssessmentSessions)
    .where(eq(skillAssessmentSessions.id, sessionId))
    .limit(1);
  const session = sessions[0];
  if (!session) throw new Error("Session not found");

  const totalPoints = session.totalPoints ?? 100;
  const finalScore = (totalEarned / totalPoints) * 100;

  // Compute domain-level scores
  const domainScores: Record<string, { earned: number; total: number; percentage: number }> = {};
  for (const a of answers) {
    // We'd need question domain info — simplified approach
    const earned = a.pointsEarned ?? a.manualScore ?? 0;
    const total = a.maxPoints;
    // Group by question (simplified)
    if (!domainScores["overall"]) domainScores["overall"] = { earned: 0, total: 0, percentage: 0 };
    domainScores["overall"].earned += earned;
    domainScores["overall"].total += total;
  }
  if (domainScores["overall"]) {
    domainScores["overall"].percentage = domainScores["overall"].total > 0
      ? (domainScores["overall"].earned / domainScores["overall"].total) * 100
      : 0;
  }

  // Determine pass/fail
  const profile = await db
    .select({ passThresholds: skillPositionProfiles.passThresholds })
    .from(skillPositionProfiles)
    .where(eq(skillPositionProfiles.positionKey, session.positionKey))
    .limit(1);
  const thresholds = (profile[0]?.passThresholds as Record<string, number>) ?? DEFAULT_THRESHOLDS;
  const requiredScore = thresholds[session.targetLevel] ?? 60;
  const passed = finalScore >= requiredScore;

  await db.update(skillAssessmentSessions)
    .set({
      status: "completed" as typeof assessmentSessionStatusEnum.enumValues[number],
      completedAt: new Date(),
      earnedPoints: totalEarned - manualPortion,
      manualPoints: manualPortion,
      finalScore: finalScore.toFixed(2),
      passed,
      domainScores,
      gradedBy,
      gradedAt: new Date(),
    })
    .where(eq(skillAssessmentSessions.id, sessionId));

  if (passed) {
    await issueCertificate(session.employeeId, session.positionKey, session.targetLevel, sessionId, finalScore);
  }

  log.info({ sessionId, finalScore, passed, gradedBy }, "grading completed");
  return { sessionId, finalScore, passed, totalEarned, manualPoints: manualPortion };
}

/** Get session details with answers */
export async function getSessionDetail(sessionId: number) {
  const db = await requireDb();
  const sessions = await db
    .select()
    .from(skillAssessmentSessions)
    .where(eq(skillAssessmentSessions.id, sessionId))
    .limit(1);
  if (!sessions[0]) return null;

  const answers = await db
    .select()
    .from(skillAssessmentAnswers)
    .where(eq(skillAssessmentAnswers.sessionId, sessionId))
    .orderBy(skillAssessmentAnswers.questionOrder)
    .limit(500);

  return { ...sessions[0], answers };
}

/** List sessions for an employee */
export async function listMySessions(employeeId: number, opts?: { positionKey?: string; limit?: number }) {
  const db = await requireDb();
  const limit = Math.min(opts?.limit ?? 50, 200);
  const conditions: ReturnType<typeof eq>[] = [
    eq(skillAssessmentSessions.employeeId, employeeId),
  ];
  if (opts?.positionKey) {
    conditions.push(eq(skillAssessmentSessions.positionKey, opts.positionKey));
  }
  return db.select().from(skillAssessmentSessions)
    .where(and(...conditions))
    .orderBy(desc(skillAssessmentSessions.createdAt)).limit(limit);
}

/** List sessions pending grading (for managers) */
export async function listPendingGrading(opts?: { positionKey?: string; limit?: number }) {
  const db = await requireDb();
  const limit = Math.min(opts?.limit ?? 50, 200);
  const conditions: ReturnType<typeof eq>[] = [
    eq(skillAssessmentSessions.status, "grading" as typeof assessmentSessionStatusEnum.enumValues[number]),
  ];
  if (opts?.positionKey) {
    conditions.push(eq(skillAssessmentSessions.positionKey, opts.positionKey));
  }
  return db.select().from(skillAssessmentSessions)
    .where(and(...conditions))
    .orderBy(skillAssessmentSessions.createdAt).limit(limit);
}

// ══════════════════════════════════════════════════════════
// 5. Certifications — 能力等级认证
// ══════════════════════════════════════════════════════════

async function issueCertificate(
  employeeId: number,
  positionKey: string,
  level: string,
  sessionId: number,
  score: number,
) {
  const db = await requireDb();

  // Supersede existing active cert for same position
  await db.update(skillLevelCerts)
    .set({ status: "superseded" as typeof certStatusEnum.enumValues[number] })
    .where(and(
      eq(skillLevelCerts.employeeId, employeeId),
      eq(skillLevelCerts.positionKey, positionKey),
      eq(skillLevelCerts.status, "active" as typeof certStatusEnum.enumValues[number]),
    ));

  // Generate cert number: GRT-CERT-{positionKey}-{level}-{timestamp}
  const certNumber = `GRT-CERT-${positionKey.toUpperCase().slice(0, 8)}-${level}-${Date.now().toString(36).toUpperCase()}`;

  await db.insert(skillLevelCerts).values({
    employeeId,
    positionKey,
    level: level as typeof skillLevelEnum.enumValues[number],
    sessionId,
    score: score.toFixed(2),
    certNumber,
    status: "active" as typeof certStatusEnum.enumValues[number],
  });

  log.info({ employeeId, positionKey, level, score, certNumber }, "skill certificate issued");
}

export async function getMyCerts(employeeId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(skillLevelCerts)
    .where(eq(skillLevelCerts.employeeId, employeeId))
    .orderBy(desc(skillLevelCerts.issuedAt))
    .limit(100);
}

export async function getCertsByPosition(positionKey: string) {
  const db = await requireDb();
  return db
    .select()
    .from(skillLevelCerts)
    .where(and(
      eq(skillLevelCerts.positionKey, positionKey),
      eq(skillLevelCerts.status, "active" as typeof certStatusEnum.enumValues[number]),
    ))
    .orderBy(desc(skillLevelCerts.issuedAt))
    .limit(500);
}

export async function revokeCert(certId: number, reason: string) {
  const db = await requireDb();
  await db.update(skillLevelCerts)
    .set({ status: "revoked" as typeof certStatusEnum.enumValues[number], revokedReason: reason })
    .where(eq(skillLevelCerts.id, certId));
  return { success: true };
}

// ══════════════════════════════════════════════════════════
// 6. Dashboard Stats — 测评总览
// ══════════════════════════════════════════════════════════

export async function getDashboardStats() {
  const db = await requireDb();

  const profileCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(skillPositionProfiles)
    .where(eq(skillPositionProfiles.isActive, true))
    .limit(1);

  const questionCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(skillQuestionBank)
    .where(eq(skillQuestionBank.isActive, true))
    .limit(1);

  const manualQuestionCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(skillQuestionBank)
    .where(and(
      eq(skillQuestionBank.isActive, true),
      eq(skillQuestionBank.isManualEntry, true),
    ))
    .limit(1);

  const sessionCount = await db
    .select({
      status: skillAssessmentSessions.status,
      count: sql<number>`count(*)::int`,
    })
    .from(skillAssessmentSessions)
    .groupBy(skillAssessmentSessions.status)
    .limit(20);

  const certCount = await db
    .select({
      level: skillLevelCerts.level,
      count: sql<number>`count(*)::int`,
    })
    .from(skillLevelCerts)
    .where(eq(skillLevelCerts.status, "active" as typeof certStatusEnum.enumValues[number]))
    .groupBy(skillLevelCerts.level)
    .limit(10);

  return {
    positionProfiles: profileCount[0]?.count ?? 0,
    totalQuestions: questionCount[0]?.count ?? 0,
    manualQuestions: manualQuestionCount[0]?.count ?? 0,
    sessionsByStatus: sessionCount,
    activeCertsByLevel: certCount,
  };
}
