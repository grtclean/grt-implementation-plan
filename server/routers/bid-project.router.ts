/**
 * 投标项目管理路由 — 从商机→投标→中标→正式项目的全程追溯
 *
 * 12 procedures:
 * createBid, listBids, getBid, updateBid, submitForReview, approveBid,
 * markBidSubmitted, markWon, markLost, cancelBid, getBidToProjectTrace, getBidDashboard
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql, eq, desc, and } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import { bidProjects } from "../../drizzle/project-finance-schema";

const log = createChildLogger("bid-project");

/** Generate BID-{BU}-{YYYY}-{NNN} code */
async function generateBidCode(buCode: string): Promise<string> {
  const db = await requireDb();
  const year = new Date().getFullYear();
  const prefix = `BID-${buCode}-${year}-`;
  const [latest] = await db
    .select({ bidCode: bidProjects.bidCode })
    .from(bidProjects)
    .where(sql`${bidProjects.bidCode} LIKE ${prefix + '%'}`)
    .orderBy(desc(bidProjects.bidCode))
    .limit(1);
  const nextNum = latest
    ? parseInt(latest.bidCode.split("-").pop() || "0") + 1
    : 1;
  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

export const bidProjectRouter = router({
  // ── 1. createBid ───────────────────────────────────────────
  createBid: requirePermission("project:create")
    .input(
      z.object({
        projectTitle: z.string().min(1),
        customerName: z.string().min(1),
        customerId: z.number().optional(),
        buCode: z.string().min(1),
        opportunityCode: z.string().optional(),
        salesRepId: z.number().optional(),
        salesRepName: z.string().optional(),
        technicalLeadId: z.number().optional(),
        technicalLeadName: z.string().optional(),
        estimatedAmount: z.string().min(1),
        estimatedCost: z.string().optional(),
        grossMarginTarget: z.string().optional(),
        bidDeadline: z.string().optional(),
        projectDescription: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const bidCode = await generateBidCode(input.buCode);
      log.info({ bidCode, customer: input.customerName }, "Creating bid");
      const [bid] = await db
        .insert(bidProjects)
        .values({
          bidCode,
          projectTitle: input.projectTitle,
          customerName: input.customerName,
          customerId: input.customerId ?? null,
          buCode: input.buCode,
          opportunityCode: input.opportunityCode ?? null,
          salesRepId: input.salesRepId ?? null,
          salesRepName: input.salesRepName ?? null,
          technicalLeadId: input.technicalLeadId ?? null,
          technicalLeadName: input.technicalLeadName ?? null,
          estimatedAmount: input.estimatedAmount,
          estimatedCost: input.estimatedCost ?? null,
          grossMarginTarget: input.grossMarginTarget ?? null,
          bidDeadline: input.bidDeadline ?? null,
          projectDescription: input.projectDescription ?? null,
          notes: input.notes ?? null,
          status: "draft",
          createdBy: ctx.user?.id ?? 0,
        })
        .returning();
      return { success: true, message: "投标创建成功", id: bid.id, bidCode };
    }),

  // ── 2. listBids ────────────────────────────────────────────
  listBids: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          buCode: z.string().optional(),
          salesRepId: z.number().optional(),
          customerName: z.string().optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: ReturnType<typeof eq>[] = [];
      if (input?.status) conditions.push(eq(bidProjects.status, input.status));
      if (input?.buCode) conditions.push(eq(bidProjects.buCode, input.buCode));
      if (input?.salesRepId)
        conditions.push(eq(bidProjects.salesRepId, input.salesRepId));
      if (input?.customerName)
        conditions.push(eq(bidProjects.customerName, input.customerName));
      if (input?.dateFrom)
        conditions.push(
          sql`${bidProjects.createdAt} >= ${input.dateFrom}`
        );
      if (input?.dateTo)
        conditions.push(
          sql`${bidProjects.createdAt} <= ${input.dateTo}`
        );
      const rows =
        conditions.length > 0
          ? await db
              .select()
              .from(bidProjects)
              .where(and(...conditions))
              .orderBy(desc(bidProjects.createdAt))
              .limit(50)
          : await db
              .select()
              .from(bidProjects)
              .orderBy(desc(bidProjects.createdAt))
              .limit(50);
      return { items: rows, total: rows.length };
    }),

  // ── 3. getBid ──────────────────────────────────────────────
  getBid: protectedProcedure
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const numId = typeof input.id === "string" ? parseInt(input.id) : input.id;
      const [bid] = await db
        .select()
        .from(bidProjects)
        .where(eq(bidProjects.id, numId))
        .limit(1);
      return bid || null;
    }),

  // ── 4. updateBid ───────────────────────────────────────────
  updateBid: requirePermission("project:edit")
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        projectTitle: z.string().optional(),
        customerName: z.string().optional(),
        customerId: z.number().optional(),
        salesRepId: z.number().optional(),
        salesRepName: z.string().optional(),
        technicalLeadId: z.number().optional(),
        technicalLeadName: z.string().optional(),
        estimatedAmount: z.string().optional(),
        estimatedCost: z.string().optional(),
        grossMarginTarget: z.string().optional(),
        bidDeadline: z.string().optional(),
        projectDescription: z.string().optional(),
        competitorInfo: z.string().optional(),
        bidDocumentUrls: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = typeof input.id === "string" ? parseInt(input.id) : input.id;
      const { id: _, ...updates } = input;
      const cleanUpdates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined) cleanUpdates[k] = v;
      }
      cleanUpdates.updatedAt = new Date().toISOString();
      await db
        .update(bidProjects)
        .set(cleanUpdates)
        .where(eq(bidProjects.id, numId));
      log.info({ bidId: numId }, "Bid updated");
      return { success: true, message: "投标信息已更新" };
    }),

  // ── 5. submitForReview ─────────────────────────────────────
  submitForReview: requirePermission("project:edit")
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = typeof input.id === "string" ? parseInt(input.id) : input.id;
      const [bid] = await db
        .select()
        .from(bidProjects)
        .where(eq(bidProjects.id, numId))
        .limit(1);
      if (!bid) return { success: false, message: "投标不存在" };
      if (bid.status !== "draft")
        return { success: false, message: "仅草稿状态可提交评审" };
      await db
        .update(bidProjects)
        .set({ status: "submitted", updatedAt: new Date().toISOString() })
        .where(eq(bidProjects.id, numId));
      log.info({ bidId: numId, bidCode: bid.bidCode }, "Bid submitted for review");
      return { success: true, message: "已提交评审" };
    }),

  // ── 6. approveBid ──────────────────────────────────────────
  approveBid: requirePermission("project:approve")
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        /** technical_review → commercial_review → approved */
        stage: z.enum(["technical_review", "commercial_review", "approved"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const numId = typeof input.id === "string" ? parseInt(input.id) : input.id;
      const [bid] = await db
        .select()
        .from(bidProjects)
        .where(eq(bidProjects.id, numId))
        .limit(1);
      if (!bid) return { success: false, message: "投标不存在" };
      // Validate stage transitions
      const validTransitions: Record<string, string[]> = {
        submitted: ["technical_review"],
        technical_review: ["commercial_review"],
        commercial_review: ["approved"],
      };
      if (!validTransitions[bid.status]?.includes(input.stage)) {
        return {
          success: false,
          message: `当前状态 ${bid.status} 无法转为 ${input.stage}`,
        };
      }
      const setValues: Record<string, unknown> = {
        status: input.stage,
        updatedAt: new Date().toISOString(),
      };
      if (input.stage === "approved") {
        setValues.approvedBy = ctx.user?.id ?? null;
        setValues.approvedAt = new Date().toISOString();
      }
      await db.update(bidProjects).set(setValues).where(eq(bidProjects.id, numId));
      log.info({ bidId: numId, stage: input.stage }, "Bid approved to stage");
      return { success: true, message: `投标已进入 ${input.stage}` };
    }),

  // ── 7. markBidSubmitted ────────────────────────────────────
  markBidSubmitted: requirePermission("project:edit")
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        bidSubmittedDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = typeof input.id === "string" ? parseInt(input.id) : input.id;
      const [bid] = await db
        .select()
        .from(bidProjects)
        .where(eq(bidProjects.id, numId))
        .limit(1);
      if (!bid) return { success: false, message: "投标不存在" };
      if (bid.status !== "approved")
        return { success: false, message: "仅已审批状态可标记为已投标" };
      await db
        .update(bidProjects)
        .set({
          status: "bid_submitted",
          bidSubmittedDate: input.bidSubmittedDate ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(bidProjects.id, numId));
      log.info({ bidId: numId }, "Bid marked as submitted");
      return { success: true, message: "投标已提交" };
    }),

  // ── 8. markWon ─────────────────────────────────────────────
  markWon: requirePermission("project:approve")
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const numId = typeof input.id === "string" ? parseInt(input.id) : input.id;
      const [bid] = await db
        .select()
        .from(bidProjects)
        .where(eq(bidProjects.id, numId))
        .limit(1);
      if (!bid) return { success: false, message: "投标不存在" };
      if (bid.status !== "bid_submitted" && bid.status !== "evaluation")
        return { success: false, message: "仅已投标或评审中状态可标记中标" };

      // Auto-generate formal project code
      const year = new Date().getFullYear();
      const formalProjectCode = `PRJ-${bid.buCode}-${year}-${String(Date.now()).slice(-6)}`;

      await db
        .update(bidProjects)
        .set({
          status: "won",
          wonDate: new Date().toISOString(),
          formalProjectCode,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(bidProjects.id, numId));

      // 自动创建正式项目记录
      const userId = ctx.user?.id ?? 0;
      try {
        await db.execute(sql`
          INSERT INTO projects (
            name, project_code, status, bu_code,
            customer_name, estimated_budget, start_date,
            created_by, created_at, updated_at
          ) VALUES (
            ${bid.projectTitle},
            ${formalProjectCode},
            'initiated',
            ${bid.buCode},
            ${bid.customerName},
            ${bid.estimatedAmount ? Number(bid.estimatedAmount) : 0},
            NOW(),
            ${userId},
            NOW(),
            NOW()
          )
        `);
        log.info({ bidCode: bid.bidCode, projectCode: formalProjectCode }, '正式项目已自动创建');

        // 记录投标中标到项目时间线
        try {
          const { recordProjectActivity } = await import('../services/hrm-integration.service');
          await recordProjectActivity({
            projectId: 0,
            projectCode: formalProjectCode,
            activityType: 'bid_won',
            activityTitle: `投标中标: ${bid.bidCode} → 正式项目 ${formalProjectCode}`,
            sourceModule: 'bid-project',
            sourceDocType: 'bid',
            sourceDocId: numId,
            sourceDocCode: bid.bidCode,
            amount: bid.estimatedAmount ? Number(bid.estimatedAmount) : undefined,
            performedBy: userId,
          });
        } catch {}

        // 验证项目已创建并回填formalProjectId
        try {
          const created = await db.execute(sql`
            SELECT id FROM projects WHERE project_code = ${formalProjectCode} LIMIT 1
          `);
          const projRows = (created as any).rows ?? [];
          if (projRows.length > 0) {
            await db.update(bidProjects)
              .set({ formalProjectId: projRows[0].id })
              .where(eq(bidProjects.id, numId));
            log.info({ bidId: numId, projectId: projRows[0].id }, 'bid→project FK已回填');
          }
        } catch (fkErr) {
          log.warn({ err: fkErr }, 'bid→project FK回填失败');
        }
      } catch (projErr) {
        log.warn({ err: projErr, bidCode: bid.bidCode }, '项目自动创建失败(可能已存在)');
      }

      log.info(
        { bidId: numId, bidCode: bid.bidCode, formalProjectCode },
        "Bid won — formal project stub created"
      );
      return {
        success: true,
        message: "恭喜中标! 已生成正式项目编号",
        formalProjectCode,
      };
    }),

  // ── 9. markLost ────────────────────────────────────────────
  markLost: requirePermission("project:edit")
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        lostReason: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = typeof input.id === "string" ? parseInt(input.id) : input.id;
      await db
        .update(bidProjects)
        .set({
          status: "lost",
          lostReason: input.lostReason,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(bidProjects.id, numId));
      log.info({ bidId: numId }, "Bid marked as lost");
      return { success: true, message: "已标记为未中标" };
    }),

  // ── 10. cancelBid ──────────────────────────────────────────
  cancelBid: requirePermission("project:edit")
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = typeof input.id === "string" ? parseInt(input.id) : input.id;
      await db
        .update(bidProjects)
        .set({
          status: "cancelled",
          notes: input.reason ?? null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(bidProjects.id, numId));
      log.info({ bidId: numId }, "Bid cancelled");
      return { success: true, message: "投标已取消" };
    }),

  // ── 11. getBidToProjectTrace ───────────────────────────────
  getBidToProjectTrace: protectedProcedure
    .input(
      z.object({
        bidCode: z.string().optional(),
        formalProjectCode: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      let bid = null;
      if (input.bidCode) {
        [bid] = await db
          .select()
          .from(bidProjects)
          .where(eq(bidProjects.bidCode, input.bidCode))
          .limit(1);
      } else if (input.formalProjectCode) {
        [bid] = await db
          .select()
          .from(bidProjects)
          .where(eq(bidProjects.formalProjectCode, input.formalProjectCode))
          .limit(1);
      }
      if (!bid) return { found: false, trace: null };
      return {
        found: true,
        trace: {
          bidCode: bid.bidCode,
          opportunityCode: bid.opportunityCode,
          formalProjectCode: bid.formalProjectCode,
          customerName: bid.customerName,
          status: bid.status,
          estimatedAmount: bid.estimatedAmount,
          wonDate: bid.wonDate,
          lostReason: bid.lostReason,
          timeline: [
            { stage: "created", date: bid.createdAt },
            bid.bidSubmittedDate
              ? { stage: "bid_submitted", date: bid.bidSubmittedDate }
              : null,
            bid.approvedAt ? { stage: "approved", date: bid.approvedAt } : null,
            bid.wonDate ? { stage: "won", date: bid.wonDate } : null,
          ].filter(Boolean),
        },
      };
    }),

  // ── 12. getBidDashboard ────────────────────────────────────
  getBidDashboard: protectedProcedure
    .input(z.object({ buCode: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: ReturnType<typeof eq>[] = [];
      if (input?.buCode) conditions.push(eq(bidProjects.buCode, input.buCode));
      const allBids =
        conditions.length > 0
          ? await db
              .select()
              .from(bidProjects)
              .where(and(...conditions))
              .orderBy(desc(bidProjects.createdAt))
              .limit(1000)
          : await db
              .select()
              .from(bidProjects)
              .orderBy(desc(bidProjects.createdAt))
              .limit(1000);

      const total = allBids.length;
      const won = allBids.filter((b) => b.status === "won").length;
      const lost = allBids.filter((b) => b.status === "lost").length;
      const decided = won + lost;
      const winRate = decided > 0 ? Math.round((won / decided) * 100) : 0;

      // Pipeline value: sum of non-terminal bids
      const activeBids = allBids.filter(
        (b) => !["won", "lost", "cancelled"].includes(b.status)
      );
      const pipelineValue = activeBids.reduce(
        (sum, b) => sum + (parseFloat(b.estimatedAmount) || 0),
        0
      );
      const wonValue = allBids
        .filter((b) => b.status === "won")
        .reduce((sum, b) => sum + (parseFloat(b.estimatedAmount) || 0), 0);

      // By BU breakdown
      const byBU: Record<string, { total: number; won: number; pipeline: number }> = {};
      for (const b of allBids) {
        const bu = b.buCode || "unknown";
        if (!byBU[bu]) byBU[bu] = { total: 0, won: 0, pipeline: 0 };
        byBU[bu].total++;
        if (b.status === "won") byBU[bu].won++;
        if (!["won", "lost", "cancelled"].includes(b.status)) {
          byBU[bu].pipeline += parseFloat(b.estimatedAmount) || 0;
        }
      }

      return {
        total,
        won,
        lost,
        winRate,
        pipelineValue,
        wonValue,
        activeBidCount: activeBids.length,
        byBU,
      };
    }),
});
