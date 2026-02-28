/**
 * Testing & Template Engine Router
 * Reusable test plan management across domains: Software UAT, PLC, FAT/SAT, custom
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import {
  testTemplates,
  testCases,
  testExecutions,
  testResults,
  aiGenerationLogs,
} from "../../drizzle/schema";
import { eq, desc, and, count, sql, asc, ilike } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const testEngineRouter = router({
  // ── Templates ──

  listTemplates: protectedProcedure.input(z.object({
    domain: z.string().optional(),
    status: z.string().optional(),
    search: z.string().optional(),
    limit: z.number().default(50),
    offset: z.number().default(0),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const conditions = [];

    if (input?.domain) {
      conditions.push(eq(testTemplates.domain, input.domain as any));
    }
    if (input?.status) {
      conditions.push(eq(testTemplates.status, input.status as any));
    }
    if (input?.search) {
      conditions.push(ilike(testTemplates.name, `%${input.search}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ value: total }]] = await Promise.all([
      db.select().from(testTemplates)
        .where(where)
        .orderBy(desc(testTemplates.updatedAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0),
      db.select({ value: count() }).from(testTemplates).where(where),
    ]);

    return { items, total: Number(total) };
  }),

  getTemplate: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const id = toNum(input.id);
    const [template] = await db.select().from(testTemplates).where(eq(testTemplates.id, id));
    if (!template) return null;

    const cases = await db.select().from(testCases)
      .where(and(eq(testCases.templateId, id), eq(testCases.isActive, true)))
      .orderBy(asc(testCases.sortOrder));

    return { ...template, caseCount: cases.length, cases };
  }),

  createTemplate: protectedProcedure.input(z.object({
    name: z.string().min(1),
    domain: z.enum(['software_uat', 'plc_test', 'fat_checklist', 'sat_checklist', 'custom']),
    description: z.string().optional(),
    scope: z.string().optional(),
    applicablePhases: z.array(z.string()).optional(),
    requiredRoles: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    estimatedTotalHours: z.string().optional(),
    passingScorePercent: z.number().optional(),
    createdBy: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [created] = await db.insert(testTemplates).values({
      name: input.name,
      domain: input.domain,
      status: 'draft',
      description: input.description,
      scope: input.scope,
      applicablePhases: input.applicablePhases,
      requiredRoles: input.requiredRoles,
      tags: input.tags,
      estimatedTotalHours: input.estimatedTotalHours,
      passingScorePercent: input.passingScorePercent,
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
    }).returning();
    return created;
  }),

  updateTemplate: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().optional(),
    status: z.enum(['draft', 'active', 'archived']).optional(),
    description: z.string().optional(),
    scope: z.string().optional(),
    applicablePhases: z.array(z.string()).optional(),
    requiredRoles: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    estimatedTotalHours: z.string().optional(),
    passingScorePercent: z.number().optional(),
    updatedBy: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, ...data } = input;
    const [updated] = await db.update(testTemplates)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(testTemplates.id, toNum(id)))
      .returning();
    return updated;
  }),

  cloneTemplate: protectedProcedure.input(z.object({
    sourceTemplateId: z.union([z.string(), z.number()]),
    newName: z.string().optional(),
    createdBy: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const srcId = toNum(input.sourceTemplateId);

    const [source] = await db.select().from(testTemplates).where(eq(testTemplates.id, srcId));
    if (!source) throw new Error("Source template not found");

    const [cloned] = await db.insert(testTemplates).values({
      name: input.newName || `${source.name} (v${source.version + 1})`,
      domain: source.domain,
      status: 'draft',
      version: source.version + 1,
      parentTemplateId: srcId,
      description: source.description,
      scope: source.scope,
      applicablePhases: source.applicablePhases,
      requiredRoles: source.requiredRoles,
      tags: source.tags,
      estimatedTotalHours: source.estimatedTotalHours,
      passingScorePercent: source.passingScorePercent,
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
    }).returning();

    const cases = await db.select().from(testCases)
      .where(and(eq(testCases.templateId, srcId), eq(testCases.isActive, true)));

    if (cases.length > 0) {
      await db.insert(testCases).values(cases.map(c => ({
        templateId: cloned.id,
        sortOrder: c.sortOrder,
        code: c.code,
        title: c.title,
        description: c.description,
        phase: c.phase,
        category: c.category,
        priority: c.priority,
        preconditions: c.preconditions,
        steps: c.steps,
        expectedResult: c.expectedResult,
        requiredRole: c.requiredRole,
        skillLevel: c.skillLevel,
        estimatedHours: c.estimatedHours,
        automatable: c.automatable,
      })));
    }

    return { ...cloned, clonedCases: cases.length };
  }),

  // ── Test Cases ──

  listCases: protectedProcedure.input(z.object({
    templateId: z.union([z.string(), z.number()]),
    includeInactive: z.boolean().default(false),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const templateId = toNum(input.templateId);
    const conditions = [eq(testCases.templateId, templateId)];
    if (!input.includeInactive) conditions.push(eq(testCases.isActive, true));

    const items = await db.select().from(testCases)
      .where(and(...conditions))
      .orderBy(asc(testCases.sortOrder));

    return { items, total: items.length };
  }),

  createCase: protectedProcedure.input(z.object({
    templateId: z.union([z.string(), z.number()]),
    sortOrder: z.number().default(0),
    code: z.string().optional(),
    title: z.string().min(1),
    description: z.string().optional(),
    phase: z.enum(['setup', 'execution', 'verification', 'teardown']).optional(),
    category: z.enum(['functional', 'performance', 'safety', 'integration', 'regression', 'acceptance']).optional(),
    priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    preconditions: z.string().optional(),
    steps: z.array(z.object({
      step: z.number(),
      action: z.string(),
      expected: z.string(),
    })).optional(),
    expectedResult: z.string().optional(),
    requiredRole: z.string().optional(),
    skillLevel: z.string().optional(),
    estimatedHours: z.string().optional(),
    automatable: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [created] = await db.insert(testCases).values({
      templateId: toNum(input.templateId),
      sortOrder: input.sortOrder,
      code: input.code,
      title: input.title,
      description: input.description,
      phase: input.phase,
      category: input.category,
      priority: input.priority,
      preconditions: input.preconditions,
      steps: input.steps,
      expectedResult: input.expectedResult,
      requiredRole: input.requiredRole,
      skillLevel: input.skillLevel,
      estimatedHours: input.estimatedHours,
      automatable: input.automatable,
    }).returning();
    return created;
  }),

  updateCase: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    sortOrder: z.number().optional(),
    code: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    phase: z.enum(['setup', 'execution', 'verification', 'teardown']).optional(),
    category: z.enum(['functional', 'performance', 'safety', 'integration', 'regression', 'acceptance']).optional(),
    priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    preconditions: z.string().optional(),
    steps: z.array(z.object({
      step: z.number(),
      action: z.string(),
      expected: z.string(),
    })).optional(),
    expectedResult: z.string().optional(),
    requiredRole: z.string().optional(),
    skillLevel: z.string().optional(),
    estimatedHours: z.string().optional(),
    automatable: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, ...data } = input;
    const [updated] = await db.update(testCases)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(testCases.id, toNum(id)))
      .returning();
    return updated;
  }),

  deleteCase: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const [updated] = await db.update(testCases)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(testCases.id, toNum(input.id)))
      .returning();
    return updated;
  }),

  // ── Executions ──

  listExecutions: protectedProcedure.input(z.object({
    templateId: z.union([z.string(), z.number()]).optional(),
    status: z.string().optional(),
    environment: z.string().optional(),
    limit: z.number().default(50),
    offset: z.number().default(0),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const conditions = [];

    if (input?.templateId) {
      conditions.push(eq(testExecutions.templateId, toNum(input.templateId)));
    }
    if (input?.status) {
      conditions.push(eq(testExecutions.status, input.status as any));
    }
    if (input?.environment) {
      conditions.push(eq(testExecutions.environment, input.environment as any));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ value: total }]] = await Promise.all([
      db.select().from(testExecutions)
        .where(where)
        .orderBy(desc(testExecutions.updatedAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0),
      db.select({ value: count() }).from(testExecutions).where(where),
    ]);

    return { items, total: Number(total) };
  }),

  createExecution: protectedProcedure.input(z.object({
    templateId: z.union([z.string(), z.number()]),
    projectId: z.number().optional(),
    executionName: z.string().min(1),
    environment: z.enum(['dev', 'staging', 'prod', 'field', 'lab']),
    plannedStartDate: z.string().optional(),
    plannedEndDate: z.string().optional(),
    leadUserId: z.number().optional(),
    teamUserIds: z.array(z.number()).optional(),
    notes: z.string().optional(),
    createdBy: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const templateId = toNum(input.templateId);

    const cases = await db.select().from(testCases)
      .where(and(eq(testCases.templateId, templateId), eq(testCases.isActive, true)));

    const [execution] = await db.insert(testExecutions).values({
      templateId,
      projectId: input.projectId,
      executionName: input.executionName,
      status: 'planned',
      environment: input.environment,
      plannedStartDate: input.plannedStartDate,
      plannedEndDate: input.plannedEndDate,
      leadUserId: input.leadUserId,
      teamUserIds: input.teamUserIds,
      totalCases: cases.length,
      notes: input.notes,
      createdBy: input.createdBy,
    }).returning();

    // Pre-create result entries for all active cases
    if (cases.length > 0) {
      await db.insert(testResults).values(cases.map(c => ({
        executionId: execution.id,
        testCaseId: c.id,
        status: 'not_started' as const,
      })));
    }

    return { ...execution, totalCases: cases.length };
  }),

  updateExecution: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    status: z.enum(['planned', 'in_progress', 'paused', 'completed', 'aborted']).optional(),
    actualStartDate: z.string().optional(),
    actualEndDate: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, ...data } = input;
    const [updated] = await db.update(testExecutions)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(testExecutions.id, toNum(id)))
      .returning();
    return updated;
  }),

  getExecution: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const id = toNum(input.id);
    const [execution] = await db.select().from(testExecutions).where(eq(testExecutions.id, id));
    if (!execution) return null;

    // Aggregate result statuses
    const results = await db.select().from(testResults)
      .where(eq(testResults.executionId, id));

    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      blocked: results.filter(r => r.status === 'blocked').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      notStarted: results.filter(r => r.status === 'not_started').length,
      partial: results.filter(r => r.status === 'partial').length,
    };

    const score = summary.total > 0
      ? ((summary.passed / summary.total) * 100).toFixed(2)
      : "0.00";

    return { ...execution, summary, overallScore: score };
  }),

  // ── Results ──

  recordResult: protectedProcedure.input(z.object({
    executionId: z.union([z.string(), z.number()]),
    testCaseId: z.union([z.string(), z.number()]),
    status: z.enum(['not_started', 'pass', 'fail', 'blocked', 'skipped', 'partial']),
    executedBy: z.number().optional(),
    actualHours: z.string().optional(),
    bugSeverity: z.enum(['critical', 'major', 'minor', 'cosmetic']).optional(),
    bugDescription: z.string().optional(),
    bugTicketUrl: z.string().optional(),
    evidenceUrls: z.array(z.string()).optional(),
    notes: z.string().optional(),
    retestOf: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const executionId = toNum(input.executionId);
    const testCaseId = toNum(input.testCaseId);

    // Check if result already exists for this execution+case
    const [existing] = await db.select().from(testResults)
      .where(and(
        eq(testResults.executionId, executionId),
        eq(testResults.testCaseId, testCaseId),
      ));

    let result;
    if (existing) {
      const [updated] = await db.update(testResults)
        .set({
          status: input.status,
          executedBy: input.executedBy,
          executedAt: new Date().toISOString(),
          actualHours: input.actualHours,
          bugSeverity: input.bugSeverity,
          bugDescription: input.bugDescription,
          bugTicketUrl: input.bugTicketUrl,
          evidenceUrls: input.evidenceUrls,
          notes: input.notes,
          retestOf: input.retestOf,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(testResults.id, existing.id))
        .returning();
      result = updated;
    } else {
      const [created] = await db.insert(testResults).values({
        executionId,
        testCaseId,
        status: input.status,
        executedBy: input.executedBy,
        executedAt: new Date().toISOString(),
        actualHours: input.actualHours,
        bugSeverity: input.bugSeverity,
        bugDescription: input.bugDescription,
        bugTicketUrl: input.bugTicketUrl,
        evidenceUrls: input.evidenceUrls,
        notes: input.notes,
        retestOf: input.retestOf,
      }).returning();
      result = created;
    }

    await updateExecutionCounters(db, executionId);
    return result;
  }),

  updateResult: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    status: z.enum(['not_started', 'pass', 'fail', 'blocked', 'skipped', 'partial']).optional(),
    executedBy: z.number().optional(),
    actualHours: z.string().optional(),
    bugSeverity: z.enum(['critical', 'major', 'minor', 'cosmetic']).optional(),
    bugDescription: z.string().optional(),
    bugTicketUrl: z.string().optional(),
    evidenceUrls: z.array(z.string()).optional(),
    notes: z.string().optional(),
    retestOf: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, ...data } = input;
    const resultId = toNum(id);

    const [updated] = await db.update(testResults)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(testResults.id, resultId))
      .returning();

    if (updated) {
      await updateExecutionCounters(db, updated.executionId);
    }
    return updated;
  }),

  getExecutionResults: protectedProcedure.input(z.object({
    executionId: z.union([z.string(), z.number()]),
    status: z.string().optional(),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const executionId = toNum(input.executionId);

    const conditions = [eq(testResults.executionId, executionId)];
    if (input.status) {
      conditions.push(eq(testResults.status, input.status as any));
    }

    const items = await db.select().from(testResults)
      .where(and(...conditions))
      .orderBy(asc(testResults.testCaseId));

    return { items, total: items.length };
  }),

  // ── AI Generation Logs ──

  logAiGeneration: protectedProcedure.input(z.object({
    templateId: z.number().optional(),
    source: z.enum(['template_generation', 'test_suggestion', 'case_optimization', 'risk_analysis']),
    promptInputConditions: z.record(z.string(), z.unknown()),
    modelUsed: z.string(),
    modelVersion: z.string().optional(),
    responseTokens: z.number().optional(),
    promptTokens: z.number().optional(),
    totalTokens: z.number().optional(),
    generatedContent: z.record(z.string(), z.unknown()).optional(),
    confidenceScore: z.string().optional(),
    userAccepted: z.boolean().optional(),
    userModifications: z.string().optional(),
    generatedBy: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [created] = await db.insert(aiGenerationLogs).values({
      templateId: input.templateId,
      source: input.source,
      promptInputConditions: input.promptInputConditions,
      modelUsed: input.modelUsed,
      modelVersion: input.modelVersion,
      responseTokens: input.responseTokens,
      promptTokens: input.promptTokens,
      totalTokens: input.totalTokens,
      generatedContent: input.generatedContent,
      confidenceScore: input.confidenceScore,
      userAccepted: input.userAccepted,
      userModifications: input.userModifications,
      generatedBy: input.generatedBy,
    }).returning();
    return created;
  }),

  getAiLogs: protectedProcedure.input(z.object({
    templateId: z.union([z.string(), z.number()]).optional(),
    source: z.string().optional(),
    limit: z.number().default(50),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const conditions = [];

    if (input?.templateId) {
      conditions.push(eq(aiGenerationLogs.templateId, toNum(input.templateId)));
    }
    if (input?.source) {
      conditions.push(eq(aiGenerationLogs.source, input.source as any));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db.select().from(aiGenerationLogs)
      .where(where)
      .orderBy(desc(aiGenerationLogs.generatedAt))
      .limit(input?.limit ?? 50);

    return { items, total: items.length };
  }),
});

/** Helper: recalculate pass/fail/blocked counters on an execution */
async function updateExecutionCounters(db: any, executionId: number) {
  const results = await db.select().from(testResults)
    .where(eq(testResults.executionId, executionId));

  const passed = results.filter((r: any) => r.status === 'pass').length;
  const failed = results.filter((r: any) => r.status === 'fail').length;
  const blocked = results.filter((r: any) => r.status === 'blocked').length;
  const total = results.length;
  const score = total > 0 ? ((passed / total) * 100).toFixed(2) : "0.00";

  await db.update(testExecutions)
    .set({
      passedCases: passed,
      failedCases: failed,
      blockedCases: blocked,
      totalCases: total,
      overallScore: score,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(testExecutions.id, executionId));
}
