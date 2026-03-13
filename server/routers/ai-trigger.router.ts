import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { jsonValue } from "@shared/validators";
import { aiAgentTriggers, aiAgentTriggerExecutions } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

/** Convert string or number ID to a numeric value */
const toNum = (id: string | number) =>
  typeof id === "string" ? parseInt(id, 10) : id;

export const aiTriggerRouter = router({
  /**
   * List all AI agent triggers, ordered by creation date descending.
   */
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db
      .select()
      .from(aiAgentTriggers)
      .orderBy(desc(aiAgentTriggers.createdAt));
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  /**
   * Get recent trigger execution history (last 100 records).
   */
  getExecutionHistory: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db
      .select()
      .from(aiAgentTriggerExecutions)
      .orderBy(desc(aiAgentTriggerExecutions.queuedAt))
      .limit(100);
  }),

  /**
   * Create a new AI agent trigger.
   * Generates a triggerCode if not provided.
   */
  create: protectedProcedure
    .input(z.object({
      triggerCode: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      agentType: z.string().optional(),
      triggerType: z.string().optional(),
      triggerConditions: z.union([z.string(), z.record(z.string(), jsonValue)]).optional(),
      cronExpression: z.string().optional(),
      triggerOnStages: z.union([z.string(), z.array(z.string())]).optional(),
      triggerOnEvents: z.union([z.string(), z.array(z.string())]).optional(),
      inputTemplate: z.union([z.string(), z.record(z.string(), jsonValue)]).optional(),
      autoApplyResult: z.boolean().optional(),
      notifyOnSuccess: z.boolean().optional(),
      notifyOnFailure: z.boolean().optional(),
      notifyRecipients: z.union([z.string(), z.array(z.string())]).optional(),
      isEnabled: z.boolean().optional(),
      priority: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const code =
        input.triggerCode || `TRG-${Date.now().toString(36).toUpperCase()}`;

      const [trigger] = await db
        .insert(aiAgentTriggers)
        .values({
          triggerCode: code,
          name: input.name || "新触发器",
          description: input.description,
          agentType: input.agentType || "general",
          triggerType: input.triggerType || "manual",
          triggerConditions:
            typeof input.triggerConditions === "string"
              ? input.triggerConditions
              : JSON.stringify(input.triggerConditions ?? null),
          cronExpression: input.cronExpression,
          triggerOnStages:
            typeof input.triggerOnStages === "string"
              ? input.triggerOnStages
              : JSON.stringify(input.triggerOnStages ?? null),
          triggerOnEvents:
            typeof input.triggerOnEvents === "string"
              ? input.triggerOnEvents
              : JSON.stringify(input.triggerOnEvents ?? null),
          inputTemplate:
            typeof input.inputTemplate === "string"
              ? input.inputTemplate
              : JSON.stringify(input.inputTemplate ?? null),
          autoApplyResult: input.autoApplyResult !== undefined
            ? (input.autoApplyResult ? 1 : 0)
            : 0,
          notifyOnSuccess: input.notifyOnSuccess !== undefined
            ? (input.notifyOnSuccess ? 1 : 0)
            : 1,
          notifyOnFailure: input.notifyOnFailure !== undefined
            ? (input.notifyOnFailure ? 1 : 0)
            : 1,
          notifyRecipients:
            typeof input.notifyRecipients === "string"
              ? input.notifyRecipients
              : JSON.stringify(input.notifyRecipients ?? null),
          isEnabled:
            input.isEnabled !== undefined ? (input.isEnabled ? 1 : 0) : 1,
          priority: input.priority ?? 0,
          createdBy: ctx.user.id,
        })
        .returning();

      return { success: true, message: "触发器创建成功", data: trigger };
    }),

  /**
   * Update an existing trigger by ID.
   * Only fields present in the input will be updated.
   */
  update: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      name: z.string().optional(),
      description: z.string().optional(),
      agentType: z.string().optional(),
      triggerType: z.string().optional(),
      triggerConditions: z.union([z.string(), z.record(z.string(), jsonValue)]).optional(),
      cronExpression: z.string().optional(),
      triggerOnStages: z.union([z.string(), z.array(z.string())]).optional(),
      triggerOnEvents: z.union([z.string(), z.array(z.string())]).optional(),
      inputTemplate: z.union([z.string(), z.record(z.string(), jsonValue)]).optional(),
      autoApplyResult: z.boolean().optional(),
      notifyOnSuccess: z.boolean().optional(),
      notifyOnFailure: z.boolean().optional(),
      notifyRecipients: z.union([z.string(), z.array(z.string())]).optional(),
      isEnabled: z.boolean().optional(),
      priority: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const id = toNum(input.id);

      const updates: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };

      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.agentType !== undefined) updates.agentType = input.agentType;
      if (input.triggerType !== undefined) updates.triggerType = input.triggerType;
      if (input.triggerConditions !== undefined) {
        updates.triggerConditions =
          typeof input.triggerConditions === "string"
            ? input.triggerConditions
            : JSON.stringify(input.triggerConditions);
      }
      if (input.cronExpression !== undefined) updates.cronExpression = input.cronExpression;
      if (input.triggerOnStages !== undefined) {
        updates.triggerOnStages =
          typeof input.triggerOnStages === "string"
            ? input.triggerOnStages
            : JSON.stringify(input.triggerOnStages);
      }
      if (input.triggerOnEvents !== undefined) {
        updates.triggerOnEvents =
          typeof input.triggerOnEvents === "string"
            ? input.triggerOnEvents
            : JSON.stringify(input.triggerOnEvents);
      }
      if (input.inputTemplate !== undefined) {
        updates.inputTemplate =
          typeof input.inputTemplate === "string"
            ? input.inputTemplate
            : JSON.stringify(input.inputTemplate);
      }
      if (input.autoApplyResult !== undefined) {
        updates.autoApplyResult = input.autoApplyResult ? 1 : 0;
      }
      if (input.notifyOnSuccess !== undefined) {
        updates.notifyOnSuccess = input.notifyOnSuccess ? 1 : 0;
      }
      if (input.notifyOnFailure !== undefined) {
        updates.notifyOnFailure = input.notifyOnFailure ? 1 : 0;
      }
      if (input.notifyRecipients !== undefined) {
        updates.notifyRecipients =
          typeof input.notifyRecipients === "string"
            ? input.notifyRecipients
            : JSON.stringify(input.notifyRecipients);
      }
      if (input.isEnabled !== undefined) updates.isEnabled = input.isEnabled ? 1 : 0;
      if (input.priority !== undefined) updates.priority = input.priority;

      const [trigger] = await db
        .update(aiAgentTriggers)
        .set(updates)
        .where(eq(aiAgentTriggers.id, id))
        .returning();

      return { success: true, message: "触发器更新成功", data: trigger };
    }),

  /**
   * Delete a trigger by ID.
   * Also deletes associated execution records to avoid orphans.
   */
  delete: requirePermission('ai:hub:access')
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const id = toNum(input.id);

      // Remove execution records first to avoid orphans
      await db
        .delete(aiAgentTriggerExecutions)
        .where(eq(aiAgentTriggerExecutions.triggerId, id));

      await db
        .delete(aiAgentTriggers)
        .where(eq(aiAgentTriggers.id, id));

      return { success: true, message: "触发器已删除" };
    }),

  /**
   * Toggle the enabled/disabled state of a trigger.
   */
  toggle: requirePermission('ai:hub:access')
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const id = toNum(input.id);

      const [trigger] = await db
        .select()
        .from(aiAgentTriggers)
        .where(eq(aiAgentTriggers.id, id))
        .limit(1000);

      if (!trigger) {
        return { success: false, message: "触发器不存在" };
      }

      const newEnabled = trigger.isEnabled === 1 ? 0 : 1;
      await db
        .update(aiAgentTriggers)
        .set({ isEnabled: newEnabled, updatedAt: new Date().toISOString() })
        .where(eq(aiAgentTriggers.id, id));

      return {
        success: true,
        message: newEnabled === 1 ? "触发器已启用" : "触发器已禁用",
        data: { id, isEnabled: newEnabled },
      };
    }),

  /**
   * Manually execute a trigger.
   * Creates an execution record and updates trigger execution statistics.
   */
  execute: requirePermission('ai:hub:access')
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      context: z.record(z.string(), jsonValue).optional(),
      triggerSource: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const id = toNum(input.id);

      const [trigger] = await db
        .select()
        .from(aiAgentTriggers)
        .where(eq(aiAgentTriggers.id, id))
        .limit(1000);

      if (!trigger) {
        return { success: false, message: "触发器不存在" };
      }

      if (trigger.isEnabled !== 1) {
        return { success: false, message: "触发器未启用，无法执行" };
      }

      const now = new Date();

      // Create the execution record
      const [execution] = await db
        .insert(aiAgentTriggerExecutions)
        .values({
          triggerId: id,
          triggerContext: JSON.stringify({
            manual: true,
            timestamp: now.toISOString(),
            ...(input.context ?? {}),
          }),
          triggerSource: input.triggerSource || "manual",
          status: "Completed",
          queuedAt: now,
          startedAt: now,
          completedAt: now,
        })
        .returning();

      // Update trigger statistics
      await db
        .update(aiAgentTriggers)
        .set({
          executionCount: (trigger.executionCount ?? 0) + 1,
          successCount: (trigger.successCount ?? 0) + 1,
          lastExecutedAt: now,
          lastExecutionStatus: "Completed",
          updatedAt: now.toISOString(),
        })
        .where(eq(aiAgentTriggers.id, id));

      return { success: true, message: "触发器已执行", data: execution };
    }),
});
