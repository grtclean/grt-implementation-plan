/**
 * Skill Assessment Router — 岗位能力等级测评
 *
 * CEO指令: 给每个岗位创造可以测试能力等级专业程度，包括人为输入题目
 *
 * 6 sub-routers, ~30 procedures:
 *   positions  (3) — list, get, upsert
 *   questions  (7) — list, get, create, update, delete, batchImport, stats
 *   papers     (3) — list, create, publish
 *   sessions   (7) — start, submitAnswer, submit, getDetail, myList, pendingGrading, completeGrading
 *   grading    (1) — gradeAnswer
 *   certs      (4) — myCerts, byPosition, revoke, dashboard
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import * as svc from "../services/skill-assessment.service";

const managePerm = requirePermission("system:config:manage");
const hrViewPerm = requirePermission("hr:salary:view");

const optionSchema = z.object({
  key: z.string(),
  text: z.string(),
  isCorrect: z.boolean().optional(),
});

const domainSchema = z.object({
  key: z.string(),
  name: z.string(),
  nameEn: z.string().optional(),
  weight: z.number(),
  description: z.string().optional(),
});

// ── Position Profiles ────────────────────────────────────

const positionsRouter = router({
  list: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      activeOnly: z.boolean().optional(),
    }).optional())
    .query(({ input }) => svc.listPositionProfiles(input ?? undefined)),

  get: protectedProcedure
    .input(z.object({ positionKey: z.string() }))
    .query(({ input }) => svc.getPositionProfile(input.positionKey)),

  upsert: managePerm
    .input(z.object({
      positionKey: z.string().max(80),
      positionName: z.string().max(200),
      positionNameEn: z.string().max(200).optional(),
      department: z.string().max(100).optional(),
      description: z.string().optional(),
      skillDomains: z.array(domainSchema),
      passThresholds: z.record(z.string(), z.number()).optional(),
      timeLimitMinutes: z.record(z.string(), z.number()).optional(),
      questionCount: z.record(z.string(), z.number()).optional(),
    }))
    .mutation(({ input, ctx }) => svc.upsertPositionProfile({ ...input, createdBy: ctx.user!.id })),
});

// ── Question Bank (含人为输入题目) ──────────────────────

const questionsRouter = router({
  list: protectedProcedure
    .input(z.object({
      positionKey: z.string(),
      domainKey: z.string().optional(),
      difficulty: z.string().optional(),
      targetLevel: z.string().optional(),
      questionType: z.string().optional(),
      manualOnly: z.boolean().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    }))
    .query(({ input }) => svc.listQuestions(input)),

  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ input }) => svc.getQuestion(input.id)),

  /** 人为输入题目 — Manager manually creates a question */
  create: hrViewPerm
    .input(z.object({
      positionKey: z.string().max(80),
      domainKey: z.string().max(80),
      questionType: z.enum(["single_choice", "multi_choice", "true_false", "fill_blank", "short_answer", "practical", "case_analysis"]),
      difficulty: z.enum(["basic", "intermediate", "advanced", "expert"]),
      targetLevels: z.array(z.enum(["L1", "L2", "L3", "L4", "L5"])),
      content: z.string().min(1),
      options: z.array(optionSchema).optional(),
      correctAnswer: z.string().optional(),
      explanation: z.string().optional(),
      points: z.number().int().min(1).max(50).optional(),
      tags: z.array(z.string()).optional(),
      reference: z.string().max(300).optional(),
    }))
    .mutation(({ input, ctx }) => svc.createQuestion({
      ...input,
      createdBy: ctx.user!.id,
      createdByName: ctx.user!.name ?? undefined,
    })),

  update: hrViewPerm
    .input(z.object({
      id: z.number().int().positive(),
      content: z.string().optional(),
      options: z.array(optionSchema).optional(),
      correctAnswer: z.string().optional(),
      explanation: z.string().optional(),
      points: z.number().int().min(1).max(50).optional(),
      difficulty: z.enum(["basic", "intermediate", "advanced", "expert"]).optional(),
      targetLevels: z.array(z.enum(["L1", "L2", "L3", "L4", "L5"])).optional(),
      tags: z.array(z.string()).optional(),
      reference: z.string().max(300).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...updates } = input;
      return svc.updateQuestion(id, updates);
    }),

  delete: managePerm
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => svc.deleteQuestion(input.id)),

  /** 批量导入题目 */
  batchImport: managePerm
    .input(z.object({
      questions: z.array(z.object({
        positionKey: z.string(),
        domainKey: z.string(),
        questionType: z.string(),
        difficulty: z.string(),
        targetLevels: z.array(z.string()),
        content: z.string(),
        options: z.array(optionSchema).optional(),
        correctAnswer: z.string().optional(),
        explanation: z.string().optional(),
        points: z.number().optional(),
      })),
    }))
    .mutation(({ input, ctx }) => svc.batchImportQuestions(
      input.questions.map(q => ({ ...q, createdBy: ctx.user!.id, createdByName: ctx.user!.name ?? undefined })),
    )),

  stats: protectedProcedure
    .input(z.object({ positionKey: z.string() }))
    .query(({ input }) => svc.getQuestionStats(input.positionKey)),
});

// ── Assessment Papers ────────────────────────────────────

const papersRouter = router({
  list: protectedProcedure
    .input(z.object({
      positionKey: z.string().optional(),
      targetLevel: z.string().optional(),
      publishedOnly: z.boolean().optional(),
    }).optional())
    .query(({ input }) => svc.listPapers(input ?? undefined)),

  create: managePerm
    .input(z.object({
      title: z.string().max(300),
      titleEn: z.string().max(300).optional(),
      positionKey: z.string(),
      targetLevel: z.enum(["L1", "L2", "L3", "L4", "L5"]),
      totalPoints: z.number().int().positive(),
      passScore: z.number().int().positive(),
      timeLimitMinutes: z.number().int().min(10).max(240).optional(),
      questionComposition: z.array(z.object({
        questionId: z.number().int().positive(),
        points: z.number().int().positive(),
        order: z.number().int().positive(),
      })),
      domainWeights: z.record(z.string(), z.number()).optional(),
    }))
    .mutation(({ input, ctx }) => svc.createPaper({ ...input, createdBy: ctx.user!.id })),

  publish: managePerm
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => svc.publishPaper(input.id)),
});

// ── Assessment Sessions ──────────────────────────────────

const sessionsRouter = router({
  /** Start a new assessment session */
  start: protectedProcedure
    .input(z.object({ paperId: z.number().int().positive() }))
    .mutation(({ input, ctx }) => svc.startSession(ctx.user!.id, input.paperId)),

  /** Submit answer for a question */
  submitAnswer: protectedProcedure
    .input(z.object({
      sessionId: z.number().int().positive(),
      questionId: z.number().int().positive(),
      answer: z.string().optional(),
      selectedOptions: z.array(z.string()).optional(),
    }))
    .mutation(({ input }) => svc.submitAnswer(input.sessionId, input.questionId, {
      answer: input.answer,
      selectedOptions: input.selectedOptions,
    })),

  /** Submit entire session (finalize) */
  submit: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .mutation(({ input }) => svc.submitSession(input.sessionId)),

  /** Get session detail with all answers */
  getDetail: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .query(({ input }) => svc.getSessionDetail(input.sessionId)),

  /** My assessment history */
  myList: protectedProcedure
    .input(z.object({
      positionKey: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    }).optional())
    .query(({ input, ctx }) => svc.listMySessions(ctx.user!.id, input ?? undefined)),

  /** Sessions pending manual grading (for managers) */
  pendingGrading: hrViewPerm
    .input(z.object({
      positionKey: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    }).optional())
    .query(({ input }) => svc.listPendingGrading(input ?? undefined)),

  /** Complete grading for all subjective questions in a session */
  completeGrading: hrViewPerm
    .input(z.object({ sessionId: z.number().int().positive() }))
    .mutation(({ input, ctx }) => svc.completeGrading(input.sessionId, ctx.user!.id)),
});

// ── Manual Grading ───────────────────────────────────────

const gradingRouter = router({
  /** Grade a single subjective answer */
  gradeAnswer: hrViewPerm
    .input(z.object({
      answerId: z.number().int().positive(),
      manualScore: z.number().int().min(0),
      manualFeedback: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => svc.gradeAnswer(input.answerId, {
      manualScore: input.manualScore,
      manualFeedback: input.manualFeedback,
      gradedBy: ctx.user!.id,
    })),
});

// ── Certifications ───────────────────────────────────────

const certsRouter = router({
  myCerts: protectedProcedure
    .query(({ ctx }) => svc.getMyCerts(ctx.user!.id)),

  byPosition: hrViewPerm
    .input(z.object({ positionKey: z.string() }))
    .query(({ input }) => svc.getCertsByPosition(input.positionKey)),

  revoke: managePerm
    .input(z.object({ certId: z.number().int().positive(), reason: z.string() }))
    .mutation(({ input }) => svc.revokeCert(input.certId, input.reason)),

  dashboard: protectedProcedure
    .query(() => svc.getDashboardStats()),
});

// ── Export combined router ───────────────────────────────

export const skillAssessmentRouter = router({
  positions: positionsRouter,
  questions: questionsRouter,
  papers: papersRouter,
  sessions: sessionsRouter,
  grading: gradingRouter,
  certs: certsRouter,
});
