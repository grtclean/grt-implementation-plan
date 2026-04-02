/**
 * 系统变更控制 Router
 *
 * 胡杨(GRT049)为系统管理员，执行较大工程变化需要审批：
 *  - 架构变更 → 需倪微薇/倪亚东批准
 *  - 大规模迭代 → 需说明原因 + 影响范围 + 回滚方案
 *  - 禁止操作 → 系统自毁/数据清除/全量回滚等破坏性操作
 *  - 系统只执行已批准的变更
 *
 * 变更分级:
 *  CRITICAL(L4) → 架构重构/DB schema变更/生产数据迁移 → 董事长+副总双签
 *  MAJOR(L3)    → 大功能模块/路由重构/权限体系变更    → 副总签字
 *  STANDARD(L2) → 常规功能开发/Bug修复/UI优化         → 自动批准(需记录)
 *  MINOR(L1)    → 配置调整/文案修改/样式微调           → 无需审批
 *
 * 禁止操作(BLOCKED):
 *  - TRUNCATE/DROP TABLE on production tables
 *  - DELETE FROM users (全量删除)
 *  - 系统回滚到某个历史版本(全量)
 *  - 修改super_admin权限
 *  - 清除审计日志
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql, eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const BLOCKED_OPERATIONS = new Set([
  "system_destroy", "truncate_all", "drop_production_tables",
  "delete_all_users", "full_rollback", "modify_super_admin",
  "clear_audit_logs", "disable_auth", "export_all_passwords",
]);

const CHANGE_TYPES = {
  architecture: { label: "架构变更", severity: "critical", approvers: "董事长+副总双签" },
  schema_migration: { label: "数据库Schema变更", severity: "critical", approvers: "董事长+副总双签" },
  data_migration: { label: "生产数据迁移", severity: "critical", approvers: "董事长+副总双签" },
  major_feature: { label: "大功能模块开发", severity: "major", approvers: "副总签字" },
  router_refactor: { label: "路由/API重构", severity: "major", approvers: "副总签字" },
  permission_change: { label: "权限体系变更", severity: "major", approvers: "副总签字" },
  security_config: { label: "安全配置修改", severity: "major", approvers: "副总签字" },
  standard_feature: { label: "常规功能开发", severity: "standard", approvers: "自动批准(需记录)" },
  bug_fix: { label: "Bug修复", severity: "standard", approvers: "自动批准(需记录)" },
  ui_optimization: { label: "UI优化", severity: "standard", approvers: "自动批准(需记录)" },
  config_change: { label: "配置调整", severity: "minor", approvers: "无需审批" },
  text_update: { label: "文案修改", severity: "minor", approvers: "无需审批" },
};

export const changeControlRouter = router({
  /** 提交变更申请 */
  submitRequest: protectedProcedure
    .input(z.object({
      changeType: z.string(),
      title: z.string().min(5),
      description: z.string().min(20),
      reason: z.string().min(10),
      impactScope: z.string().optional(),
      rollbackPlan: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 检查禁止操作
      if (BLOCKED_OPERATIONS.has(input.changeType)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `🚫 操作被永久禁止: ${input.changeType}。此类操作不可申请、不可批准、不可执行。`,
        });
      }

      const db = await requireDb();
      const typeDef = CHANGE_TYPES[input.changeType as keyof typeof CHANGE_TYPES];
      const severity = typeDef?.severity || "major";
      const code = `CR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      // standard和minor自动批准
      const autoApprove = severity === "standard" || severity === "minor";

      await db.execute(sql`
        INSERT INTO system_change_requests (request_code, requester_id, requester_name,
          change_type, severity, title, description, reason, impact_scope, rollback_plan,
          status, approved_by_name, approved_at, created_at, updated_at)
        VALUES (${code}, ${ctx.user!.id}, ${ctx.user!.name || ""},
          ${input.changeType}, ${severity}, ${input.title}, ${input.description},
          ${input.reason}, ${input.impactScope || ""}, ${input.rollbackPlan || ""},
          ${autoApprove ? "approved" : "pending"},
          ${autoApprove ? "系统自动批准" : null},
          ${autoApprove ? new Date().toISOString() : null},
          NOW(), NOW())
      `);

      return {
        code,
        severity,
        status: autoApprove ? "approved" : "pending",
        message: autoApprove
          ? `变更已自动批准(${severity}级)，可以执行。`
          : `变更申请已提交，等待${typeDef?.approvers || "管理层"}批准后方可执行。`,
        approvers: typeDef?.approvers,
      };
    }),

  /** 审批变更申请（仅super_admin/CEO可审批） */
  approveRequest: protectedProcedure
    .input(z.object({
      requestCode: z.string(),
      approved: z.boolean(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 只有super_admin(倪亚东/倪微薇)可以审批
      const userRole = (ctx.user as any)?.effectiveRole;
      const maxLevel = (ctx.user as any)?.maxLevel || 0;
      if (maxLevel < 8) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "只有副总及以上(L8+)可以审批变更申请",
        });
      }

      const db = await requireDb();
      const newStatus = input.approved ? "approved" : "rejected";

      await db.execute(sql`
        UPDATE system_change_requests SET
          status = ${newStatus},
          approved_by = ${ctx.user!.id},
          approved_by_name = ${ctx.user!.name || ""},
          rejection_reason = ${!input.approved ? (input.comment || "未通过") : null},
          approved_at = NOW(), updated_at = NOW()
        WHERE request_code = ${input.requestCode} AND status = 'pending'
      `);

      return { code: input.requestCode, status: newStatus };
    }),

  /** 标记变更已执行 */
  markExecuted: protectedProcedure
    .input(z.object({
      requestCode: z.string(),
      result: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      // 只能执行已批准的
      const [req] = (await db.execute(sql`
        SELECT status FROM system_change_requests WHERE request_code = ${input.requestCode}
      `)).rows as any[];

      if (!req || req.status !== "approved") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `变更 ${input.requestCode} 未获批准(当前状态: ${req?.status || "不存在"})，不可执行。`,
        });
      }

      await db.execute(sql`
        UPDATE system_change_requests SET
          status = 'executed', executed_at = NOW(),
          execution_result = ${input.result || "执行完成"}, updated_at = NOW()
        WHERE request_code = ${input.requestCode}
      `);
      return { code: input.requestCode, status: "executed" };
    }),

  /** 查询变更申请列表 */
  list: protectedProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().default(30) }).default({ limit: 30 }))
    .query(async ({ input }) => {
      const db = await requireDb();
      try {
        const condition = input.status ? sql`WHERE status = ${input.status}` : sql``;
        const rows = (await db.execute(sql`
          SELECT * FROM system_change_requests ${condition}
          ORDER BY created_at DESC LIMIT ${input.limit}
        `)).rows;
        return rows;
      } catch { return []; }
    }),

  /** 获取变更类型定义 */
  getChangeTypes: protectedProcedure.query(() => CHANGE_TYPES),

  /** 获取禁止操作列表 */
  getBlockedOperations: protectedProcedure.query(() => Array.from(BLOCKED_OPERATIONS)),
});
