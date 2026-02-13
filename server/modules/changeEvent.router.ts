/**
 * 变更事件路由 (Change Event Router)
 *
 * tRPC端点，用于管理设计变更 → BOM变更 → 采购单更新的链式通知。
 *
 * 端点:
 *   - changeEvent.list        查询变更事件列表（支持按类型/状态/项目筛选）
 *   - changeEvent.create      创建变更事件（自动触发下游通知）
 *   - changeEvent.acknowledge 确认变更事件
 *   - changeEvent.getChain    获取完整的变更链（从根事件到所有下游）
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  listChangeEvents,
  createChangeEvent,
  acknowledgeChangeEvent,
  getChangeChain,
  getChangeEventById,
  resolveChangeEvent,
} from "./changeEvent.service";

const changeEventTypeSchema = z.enum(["design_change", "bom_change", "po_update"]);
const changeEventStatusSchema = z.enum(["pending", "acknowledged", "resolved"]);

const affectedItemSchema = z.object({
  itemCode: z.string(),
  itemName: z.string(),
  field: z.string().optional(),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
});

export const changeEventRouter = router({
  /**
   * 查询变更事件列表
   * 支持按 type / status / projectId 过滤，分页
   */
  list: protectedProcedure
    .input(
      z.object({
        type: changeEventTypeSchema.optional(),
        status: changeEventStatusSchema.optional(),
        projectId: z.number().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const { page, pageSize, ...filters } = input;
      const offset = (page - 1) * pageSize;

      const result = await listChangeEvents({
        ...filters,
        limit: pageSize,
        offset,
      });

      return {
        items: result.items,
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize),
      };
    }),

  /**
   * 创建变更事件
   *
   * 创建一条变更事件记录，如果类型为 design_change 或 bom_change，
   * 系统会自动创建对应的下游通知事件：
   *   design_change → 自动创建 bom_change (pending)
   *   bom_change    → 自动创建 po_update  (pending)
   */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        type: changeEventTypeSchema,
        title: z.string().min(1).max(300),
        description: z.string().optional(),
        sourceChangeId: z.number().optional(),
        affectedItems: z.array(affectedItemSchema).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await createChangeEvent({
        ...input,
        createdBy: ctx.user?.id ?? 0,
      });

      return {
        success: true,
        event: result.event,
        downstreamEvent: result.downstreamEvent,
        message: result.downstreamEvent
          ? `变更事件已创建，并自动生成下游通知事件 #${result.downstreamEvent.id}`
          : "变更事件已创建",
      };
    }),

  /**
   * 确认变更事件
   * 将状态从 pending 变为 acknowledged
   */
  acknowledge: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await getChangeEventById(input.id);
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `变更事件 #${input.id} 不存在`,
        });
      }

      if (existing.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `变更事件 #${input.id} 当前状态为 ${existing.status}，只有 pending 状态可以确认`,
        });
      }

      const updated = await acknowledgeChangeEvent(
        input.id,
        ctx.user?.id ?? 0,
      );

      return {
        success: true,
        event: updated,
        message: `变更事件 #${input.id} 已确认`,
      };
    }),

  /**
   * 将变更事件标记为已解决
   */
  resolve: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await getChangeEventById(input.id);
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `变更事件 #${input.id} 不存在`,
        });
      }

      if (existing.status === "resolved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `变更事件 #${input.id} 已经处于 resolved 状态`,
        });
      }

      const updated = await resolveChangeEvent(input.id);

      return {
        success: true,
        event: updated,
        message: `变更事件 #${input.id} 已解决`,
      };
    }),

  /**
   * 获取完整的变更链
   *
   * 给定任意一个事件ID，沿 sourceChangeId 溯源到根事件，
   * 然后向下收集所有下游事件，返回完整的链式结构。
   *
   * 示例链: design_change #1 → bom_change #2 → po_update #3
   */
  getChain: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const chain = await getChangeChain(input.eventId);

      if (!chain) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `变更事件 #${input.eventId} 不存在`,
        });
      }

      return chain;
    }),

  /**
   * 根据ID获取单个变更事件详情
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const event = await getChangeEventById(input.id);

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `变更事件 #${input.id} 不存在`,
        });
      }

      return event;
    }),
});
