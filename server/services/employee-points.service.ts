/**
 * Employee Points & Credit Service — 员工积分奖惩系统
 *
 * Core service for the CEO-directed points system:
 * - Award/deduct points based on rules
 * - Track daily compliance (morning plan, evening summary)
 * - Enforce thresholds (<500 = suspend excellence, <0 = observation)
 * - Manage redemption requests
 * - Sync with existing gamification XP system
 */

import { requireDb } from "../db";
import { eq, and, sql, desc, type SQL } from "drizzle-orm";
import {
  pointRules,
  pointTransactions,
  pointBalances,
  pointRedemptionCatalog,
  pointRedemptions,
  pointThresholds,
  pointEnforcementLog,
  dailyComplianceChecks,
} from "../../drizzle/employee-points-schema";
import { grantXP } from "./gamification.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("employee-points");

// ── Helper: today's date string ───────────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Role Multiplier Resolution ────────────────────────────
// CEO directive: engineer+ ×10, manager+ ×100, bu_gm ×100
// Roles mapped to tiers for fallback resolution

const ROLE_TIER_MAP: Record<string, string[]> = {
  // Tier 1: base (×1)
  employee: ["employee", "staff", "intern"],
  // Tier 2: engineer+ (×10)
  engineer: ["engineer", "specialist", "team_leader", "quality_eng", "procurement_eng", "cs_engineer", "bu_mech", "bu_elec"],
  // Tier 3: manager+ (×100)
  manager: ["manager", "director", "bu_gm", "bu_sales", "bu_pm", "vp", "ceo", "cfo", "cto", "hr_manager", "admin"],
};

function resolveRoleMultiplier(
  roleMultipliers: Record<string, number> | null | undefined,
  employeeRole?: string,
): number {
  if (!roleMultipliers || !employeeRole) return 1;

  // Direct match
  if (roleMultipliers[employeeRole] !== undefined) {
    return roleMultipliers[employeeRole];
  }

  // Tier fallback
  for (const [_tier, roles] of Object.entries(ROLE_TIER_MAP)) {
    if (roles.includes(employeeRole)) {
      // Find any role in this tier that has a multiplier defined
      for (const r of roles) {
        if (roleMultipliers[r] !== undefined) return roleMultipliers[r];
      }
    }
  }

  return 1; // default
}

// ══════════════════════════════════════════════════════════
// 1. Award / Deduct Points
// ══════════════════════════════════════════════════════════

export async function awardPoints(input: {
  employeeId: number;
  ruleCode: string;
  description?: string;
  sourceType?: string;
  sourceId?: string;
  grantedBy?: number;
  /** Override points from rule if needed (for manager_award / ceo_special_award) */
  pointsOverride?: number;
  /** Employee's role for multiplier resolution */
  employeeRole?: string;
}): Promise<{ points: number; newBalance: number; thresholdActions: string[] }> {
  const db = await requireDb();
  const date = todayStr();

  // Look up rule
  const [rule] = await db.select().from(pointRules)
    .where(eq(pointRules.code, input.ruleCode))
    .limit(1);

  if (!rule || !rule.isActive) {
    throw new Error(`积分规则 ${input.ruleCode} 不存在或已停用`);
  }

  // Apply role-based multiplier
  const basePoints = input.pointsOverride ?? rule.points;
  const multiplier = resolveRoleMultiplier(rule.roleMultipliers as Record<string, number> | null, input.employeeRole);
  const pointsAmount = basePoints * multiplier;

  // Check daily/monthly caps
  if (rule.maxPerDay) {
    const [dayCount] = await db.select({ cnt: sql<number>`COUNT(*)` })
      .from(pointTransactions)
      .where(and(
        eq(pointTransactions.employeeId, input.employeeId),
        eq(pointTransactions.ruleCode, input.ruleCode),
        eq(pointTransactions.transactionDate, date),
      ));
    if ((dayCount?.cnt ?? 0) >= rule.maxPerDay) {
      log.debug({ employeeId: input.employeeId, ruleCode: input.ruleCode }, "Daily cap reached");
      return { points: 0, newBalance: await getBalance(input.employeeId), thresholdActions: [] };
    }
  }

  if (rule.maxPerMonth) {
    const monthPrefix = date.slice(0, 7);
    const [monthCount] = await db.select({ cnt: sql<number>`COUNT(*)` })
      .from(pointTransactions)
      .where(and(
        eq(pointTransactions.employeeId, input.employeeId),
        eq(pointTransactions.ruleCode, input.ruleCode),
        sql`${pointTransactions.transactionDate} LIKE ${monthPrefix + '%'}`,
      ));
    if ((monthCount?.cnt ?? 0) >= rule.maxPerMonth) {
      log.debug({ employeeId: input.employeeId, ruleCode: input.ruleCode }, "Monthly cap reached");
      return { points: 0, newBalance: await getBalance(input.employeeId), thresholdActions: [] };
    }
  }

  // Update balance
  const newBalance = await updateBalance(input.employeeId, pointsAmount);

  // Record transaction
  await db.insert(pointTransactions).values({
    employeeId: input.employeeId,
    ruleCode: input.ruleCode,
    type: pointsAmount >= 0 ? "award" : "penalty",
    points: pointsAmount,
    balanceAfter: newBalance,
    description: input.description || rule.name,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    grantedBy: input.grantedBy,
    transactionDate: date,
  });

  // Also sync to gamification XP system (positive only)
  if (pointsAmount > 0) {
    try {
      await grantXP(input.employeeId, `points_${input.ruleCode}`, pointsAmount, "points_system");
    } catch (e) {
      log.warn({ employeeId: input.employeeId, error: e }, "Failed to sync XP");
    }
  }

  // Check thresholds
  const thresholdActions = await enforceThresholds(input.employeeId, newBalance);

  log.info({
    employeeId: input.employeeId,
    ruleCode: input.ruleCode,
    points: pointsAmount,
    newBalance,
    thresholdActions,
  }, "Points awarded");

  return { points: pointsAmount, newBalance, thresholdActions };
}

// ══════════════════════════════════════════════════════════
// 2. Balance Management
// ══════════════════════════════════════════════════════════

async function updateBalance(employeeId: number, pointsDelta: number): Promise<number> {
  const db = await requireDb();

  const [existing] = await db.select().from(pointBalances)
    .where(eq(pointBalances.employeeId, employeeId))
    .limit(1);

  if (!existing) {
    const newBal = pointsDelta;
    await db.insert(pointBalances).values({
      employeeId,
      currentBalance: newBal,
      totalEarned: pointsDelta >= 0 ? pointsDelta : 0,
      totalPenalties: pointsDelta < 0 ? Math.abs(pointsDelta) : 0,
      ytdPoints: pointsDelta,
    });
    return newBal;
  }

  const newBalance = existing.currentBalance + pointsDelta;
  const updates: Record<string, unknown> = {
    currentBalance: newBalance,
    ytdPoints: existing.ytdPoints + pointsDelta,
    updatedAt: new Date(),
  };
  if (pointsDelta >= 0) {
    updates.totalEarned = existing.totalEarned + pointsDelta;
  } else {
    updates.totalPenalties = existing.totalPenalties + Math.abs(pointsDelta);
  }

  await db.update(pointBalances)
    .set(updates)
    .where(eq(pointBalances.employeeId, employeeId));

  return newBalance;
}

export async function getBalance(employeeId: number): Promise<number> {
  const db = await requireDb();
  const [row] = await db.select().from(pointBalances)
    .where(eq(pointBalances.employeeId, employeeId))
    .limit(1);
  return row?.currentBalance ?? 0;
}

export async function getBalanceDetail(employeeId: number) {
  const db = await requireDb();
  const [row] = await db.select().from(pointBalances)
    .where(eq(pointBalances.employeeId, employeeId))
    .limit(1);
  return row ?? {
    employeeId,
    currentBalance: 0,
    totalEarned: 0,
    totalSpent: 0,
    totalPenalties: 0,
    ytdPoints: 0,
    isOnObservation: false,
    isExcellenceSuspended: false,
    excellenceSuspendedUntil: null,
  };
}

// ══════════════════════════════════════════════════════════
// 3. Threshold Enforcement
// ══════════════════════════════════════════════════════════

async function enforceThresholds(employeeId: number, currentBalance: number): Promise<string[]> {
  const db = await requireDb();
  const actions: string[] = [];

  const thresholds = await db.select().from(pointThresholds)
    .where(eq(pointThresholds.isActive, true))
    .limit(20);

  for (const t of thresholds) {
    const triggered = t.direction === "below" ? currentBalance < t.threshold : currentBalance >= t.threshold;

    if (triggered) {
      // Check if already enforced and not lifted
      const [existing] = await db.select().from(pointEnforcementLog)
        .where(and(
          eq(pointEnforcementLog.employeeId, employeeId),
          eq(pointEnforcementLog.thresholdId, t.id),
          sql`${pointEnforcementLog.liftedAt} IS NULL`,
        ))
        .limit(1);

      if (!existing) {
        // Enforce
        await db.insert(pointEnforcementLog).values({
          employeeId,
          thresholdId: t.id,
          action: t.action,
          pointsAtTrigger: currentBalance,
        });

        // Update balance flags
        if (t.action === "suspend_excellence") {
          const untilDate = t.durationDays
            ? new Date(Date.now() + t.durationDays * 86400000).toISOString().slice(0, 10)
            : null;
          await db.update(pointBalances)
            .set({ isExcellenceSuspended: true, excellenceSuspendedUntil: untilDate })
            .where(eq(pointBalances.employeeId, employeeId));
        } else if (t.action === "observation_list") {
          await db.update(pointBalances)
            .set({ isOnObservation: true })
            .where(eq(pointBalances.employeeId, employeeId));
        } else if (t.action === "company_announcement_honor" || t.action === "company_announcement_warning") {
          try {
            await publishMilestoneAnnouncement(db, employeeId, currentBalance, t.threshold, t.action);
          } catch (e) {
            log.warn({ employeeId, error: e }, "Failed to publish milestone announcement (non-fatal)");
          }
        }

        actions.push(t.action);
        log.warn({
          employeeId, action: t.action, balance: currentBalance, threshold: t.threshold,
        }, "Threshold enforcement triggered");
      }
    } else {
      // Check if enforcement should be lifted
      const [active] = await db.select().from(pointEnforcementLog)
        .where(and(
          eq(pointEnforcementLog.employeeId, employeeId),
          eq(pointEnforcementLog.thresholdId, t.id),
          sql`${pointEnforcementLog.liftedAt} IS NULL`,
        ))
        .limit(1);

      if (active) {
        await db.update(pointEnforcementLog)
          .set({ liftedAt: new Date(), liftedReason: `余额恢复至${currentBalance}，高于阈值${t.threshold}` })
          .where(eq(pointEnforcementLog.id, active.id));

        if (t.action === "suspend_excellence") {
          await db.update(pointBalances)
            .set({ isExcellenceSuspended: false, excellenceSuspendedUntil: null })
            .where(eq(pointBalances.employeeId, employeeId));
        } else if (t.action === "observation_list") {
          await db.update(pointBalances)
            .set({ isOnObservation: false })
            .where(eq(pointBalances.employeeId, employeeId));
        }

        log.info({ employeeId, action: t.action, balance: currentBalance }, "Threshold enforcement lifted");
      }
    }
  }

  return actions;
}

// ══════════════════════════════════════════════════════════
// 4. Daily Compliance Checks
// ══════════════════════════════════════════════════════════

/**
 * Called after clock-in to create the morning_plan compliance check.
 * Sets a 15-minute deadline for plan submission.
 */
export async function createMorningPlanCheck(employeeId: number, clockInTime: string) {
  const db = await requireDb();
  const date = todayStr();

  // Check if already exists
  const [existing] = await db.select().from(dailyComplianceChecks)
    .where(and(
      eq(dailyComplianceChecks.employeeId, employeeId),
      eq(dailyComplianceChecks.checkDate, date),
      eq(dailyComplianceChecks.checkType, "morning_plan"),
    ))
    .limit(1);

  if (existing) return existing;

  const clockIn = new Date(clockInTime);
  const deadline = new Date(clockIn.getTime() + 15 * 60 * 1000); // +15 minutes

  const [row] = await db.insert(dailyComplianceChecks).values({
    employeeId,
    checkDate: date,
    checkType: "morning_plan",
    passed: false,
    deadline,
  }).returning();

  log.info({ employeeId, deadline: deadline.toISOString() }, "Morning plan compliance check created");
  return row;
}

/**
 * Called when an employee submits their daily work plan.
 * Checks if it's within the 15-minute deadline.
 */
export async function completeMorningPlanCheck(employeeId: number, planId?: string) {
  const db = await requireDb();
  const date = todayStr();
  const now = new Date();

  const [check] = await db.select().from(dailyComplianceChecks)
    .where(and(
      eq(dailyComplianceChecks.employeeId, employeeId),
      eq(dailyComplianceChecks.checkDate, date),
      eq(dailyComplianceChecks.checkType, "morning_plan"),
    ))
    .limit(1);

  if (!check) {
    // No clock-in today, or check not created yet — create and pass
    return { passed: true, onTime: true, points: 3 };
  }

  if (check.passed) {
    return { passed: true, onTime: true, points: 0, note: "已完成" };
  }

  const onTime = check.deadline ? now <= new Date(check.deadline) : true;
  const ruleCode = onTime ? "morning_plan_ontime" : "morning_plan_late";

  await db.update(dailyComplianceChecks)
    .set({
      passed: true,
      completedAt: now,
      sourceType: "daily_plan",
      sourceId: planId,
    })
    .where(eq(dailyComplianceChecks.id, check.id));

  const result = await awardPoints({
    employeeId,
    ruleCode,
    description: onTime ? "按时提交晨间工作计划" : "晨间工作计划迟交",
    sourceType: "daily_plan",
    sourceId: planId,
  });

  await db.update(dailyComplianceChecks)
    .set({ pointsApplied: result.points })
    .where(eq(dailyComplianceChecks.id, check.id));

  return { passed: true, onTime, points: result.points, newBalance: result.newBalance };
}

/**
 * Called when an employee submits their daily work summary/log.
 */
export async function completeEveningSummaryCheck(employeeId: number, logId?: string) {
  const db = await requireDb();
  const date = todayStr();

  const [existing] = await db.select().from(dailyComplianceChecks)
    .where(and(
      eq(dailyComplianceChecks.employeeId, employeeId),
      eq(dailyComplianceChecks.checkDate, date),
      eq(dailyComplianceChecks.checkType, "evening_summary"),
    ))
    .limit(1);

  if (existing?.passed) {
    return { passed: true, points: 0, note: "已完成" };
  }

  if (existing) {
    await db.update(dailyComplianceChecks)
      .set({ passed: true, completedAt: new Date(), sourceType: "daily_log", sourceId: logId })
      .where(eq(dailyComplianceChecks.id, existing.id));
  } else {
    await db.insert(dailyComplianceChecks).values({
      employeeId,
      checkDate: date,
      checkType: "evening_summary",
      passed: true,
      completedAt: new Date(),
      sourceType: "daily_log",
      sourceId: logId,
    });
  }

  const result = await awardPoints({
    employeeId,
    ruleCode: "evening_summary_done",
    description: "按时提交工作总结",
    sourceType: "daily_log",
    sourceId: logId,
  });

  return { passed: true, points: result.points, newBalance: result.newBalance };
}

/**
 * Called when an employee prepares the next workday's plan.
 * Awards 2 bonus points per CEO directive.
 */
export async function completeNextDayPlanCheck(employeeId: number, planId?: string) {
  const db = await requireDb();
  const date = todayStr();

  const [existing] = await db.select().from(dailyComplianceChecks)
    .where(and(
      eq(dailyComplianceChecks.employeeId, employeeId),
      eq(dailyComplianceChecks.checkDate, date),
      eq(dailyComplianceChecks.checkType, "next_day_plan"),
    ))
    .limit(1);

  if (existing?.passed) {
    return { passed: true, points: 0, note: "已完成" };
  }

  if (existing) {
    await db.update(dailyComplianceChecks)
      .set({ passed: true, completedAt: new Date(), sourceType: "daily_plan", sourceId: planId })
      .where(eq(dailyComplianceChecks.id, existing.id));
  } else {
    await db.insert(dailyComplianceChecks).values({
      employeeId,
      checkDate: date,
      checkType: "next_day_plan",
      passed: true,
      completedAt: new Date(),
      sourceType: "daily_plan",
      sourceId: planId,
    });
  }

  const result = await awardPoints({
    employeeId,
    ruleCode: "next_day_plan_done",
    description: "完成次日工作计划",
    sourceType: "daily_plan",
    sourceId: planId,
  });

  return { passed: true, points: result.points, newBalance: result.newBalance };
}

/**
 * End-of-day batch: penalize employees who never submitted plan/summary.
 * Called by scheduler at 22:00.
 */
export async function runEndOfDayPenalties() {
  const db = await requireDb();
  const date = todayStr();

  // Find all employees who clocked in today but didn't submit morning plan
  const missingPlans = await db.execute(sql`
    SELECT acr.employee_id
    FROM attendance_clock_records acr
    LEFT JOIN daily_compliance_checks dcc
      ON dcc.employee_id = acr.employee_id
      AND dcc.check_date = ${date}
      AND dcc.check_type = 'morning_plan'
    WHERE acr.clock_date = ${date}
      AND acr.clock_in_time IS NOT NULL
      AND (dcc.id IS NULL OR dcc.passed = false)
    LIMIT 500
  `);

  let penalized = 0;
  for (const row of missingPlans.rows as { employee_id: number }[]) {
    await awardPoints({
      employeeId: row.employee_id,
      ruleCode: "morning_plan_missing",
      description: `${date} 未提交晨间工作计划`,
    });
    penalized++;
  }

  // Find employees who clocked in but didn't submit evening summary
  const missingSummaries = await db.execute(sql`
    SELECT acr.employee_id
    FROM attendance_clock_records acr
    LEFT JOIN daily_compliance_checks dcc
      ON dcc.employee_id = acr.employee_id
      AND dcc.check_date = ${date}
      AND dcc.check_type = 'evening_summary'
    WHERE acr.clock_date = ${date}
      AND acr.clock_in_time IS NOT NULL
      AND (dcc.id IS NULL OR dcc.passed = false)
    LIMIT 500
  `);

  for (const row of missingSummaries.rows as { employee_id: number }[]) {
    await awardPoints({
      employeeId: row.employee_id,
      ruleCode: "evening_summary_missing",
      description: `${date} 未提交工作总结`,
    });
    penalized++;
  }

  log.info({ date, penalized }, "End-of-day compliance penalties applied");
  return { date, penalized };
}

// ══════════════════════════════════════════════════════════
// 5. Redemption
// ══════════════════════════════════════════════════════════

export async function requestRedemption(input: {
  employeeId: number;
  catalogCode: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}) {
  const db = await requireDb();

  // Look up catalog item
  const [item] = await db.select().from(pointRedemptionCatalog)
    .where(eq(pointRedemptionCatalog.code, input.catalogCode))
    .limit(1);

  if (!item || !item.isActive) {
    throw new Error("兑换项目不存在或已下架");
  }

  // Check balance
  const balance = await getBalance(input.employeeId);
  if (balance < item.pointsCost) {
    throw new Error(`积分不足：需要${item.pointsCost}分，当前${balance}分`);
  }
  if (item.minBalance && balance - item.pointsCost < item.minBalance) {
    throw new Error(`兑换后余额不能低于${item.minBalance}分`);
  }

  // Check stock
  if (item.availableQty !== -1 && item.availableQty <= 0) {
    throw new Error("该兑换项目已无库存");
  }

  // Create redemption request
  const [redemption] = await db.insert(pointRedemptions).values({
    employeeId: input.employeeId,
    catalogItemId: item.id,
    catalogCode: item.code,
    pointsSpent: item.pointsCost,
    requestedStartDate: input.startDate,
    requestedEndDate: input.endDate,
    employeeNotes: input.notes,
  }).returning();

  log.info({
    employeeId: input.employeeId,
    catalogCode: input.catalogCode,
    pointsCost: item.pointsCost,
  }, "Redemption request created");

  return redemption;
}

export async function approveRedemption(redemptionId: number, approvedBy: number, notes?: string) {
  const db = await requireDb();

  const [redemption] = await db.select().from(pointRedemptions)
    .where(eq(pointRedemptions.id, redemptionId))
    .limit(1);

  if (!redemption || redemption.status !== "pending") {
    throw new Error("兑换申请不存在或已处理");
  }

  // Deduct points
  const newBalance = await updateBalance(redemption.employeeId, -redemption.pointsSpent);

  // Record transaction
  await db.insert(pointTransactions).values({
    employeeId: redemption.employeeId,
    ruleCode: null,
    type: "redeem",
    points: -redemption.pointsSpent,
    balanceAfter: newBalance,
    description: `兑换: ${redemption.catalogCode}`,
    sourceType: "redemption",
    sourceId: String(redemptionId),
    grantedBy: approvedBy,
    transactionDate: todayStr(),
  });

  // Update redemption status
  await db.update(pointRedemptions)
    .set({ status: "approved", approvedBy, approvedAt: new Date(), approvalNotes: notes, updatedAt: new Date() })
    .where(eq(pointRedemptions.id, redemptionId));

  // Update stock
  const [item] = await db.select().from(pointRedemptionCatalog)
    .where(eq(pointRedemptionCatalog.id, redemption.catalogItemId))
    .limit(1);
  if (item && item.availableQty > 0) {
    await db.update(pointRedemptionCatalog)
      .set({ availableQty: item.availableQty - 1 })
      .where(eq(pointRedemptionCatalog.id, item.id));
  }

  // Update spending total
  await db.update(pointBalances)
    .set({ totalSpent: sql`total_spent + ${redemption.pointsSpent}` })
    .where(eq(pointBalances.employeeId, redemption.employeeId));

  // Check thresholds after deduction
  await enforceThresholds(redemption.employeeId, newBalance);

  log.info({ redemptionId, approvedBy, pointsSpent: redemption.pointsSpent }, "Redemption approved");
  return { success: true, newBalance };
}

export async function rejectRedemption(redemptionId: number, rejectedBy: number, notes?: string) {
  const db = await requireDb();
  await db.update(pointRedemptions)
    .set({ status: "rejected", approvedBy: rejectedBy, approvedAt: new Date(), approvalNotes: notes, updatedAt: new Date() })
    .where(eq(pointRedemptions.id, redemptionId));
  return { success: true };
}

// ══════════════════════════════════════════════════════════
// 6. Queries
// ══════════════════════════════════════════════════════════

export async function getTransactionHistory(employeeId: number, limit = 50) {
  const db = await requireDb();
  return db.select().from(pointTransactions)
    .where(eq(pointTransactions.employeeId, employeeId))
    .orderBy(desc(pointTransactions.createdAt))
    .limit(limit);
}

export async function getLeaderboard(limit = 50) {
  const db = await requireDb();
  const rows = await db.execute(sql`
    SELECT pb.employee_id, pb.current_balance, pb.total_earned, pb.ytd_points,
           pb.is_on_observation, pb.is_excellence_suspended,
           COALESCE(e.name, CONCAT('员工#', pb.employee_id)) AS employee_name,
           COALESCE(e.department, '') AS department
    FROM point_balances pb
    LEFT JOIN hrm_employees e ON e.id = pb.employee_id
    ORDER BY pb.ytd_points DESC
    LIMIT ${limit}
  `);
  return (rows.rows as { employee_id: number; employee_name: string; department: string; current_balance: number; total_earned: number; ytd_points: number; is_on_observation: boolean; is_excellence_suspended: boolean }[]).map((r, idx) => ({
    rank: idx + 1,
    employeeId: r.employee_id,
    employeeName: r.employee_name,
    department: r.department,
    currentBalance: r.current_balance,
    totalEarned: r.total_earned,
    ytdPoints: r.ytd_points,
    isOnObservation: r.is_on_observation,
    isExcellenceSuspended: r.is_excellence_suspended,
  }));
}

export async function getComplianceStatus(employeeId: number, date?: string) {
  const db = await requireDb();
  const checkDate = date || todayStr();
  const checks = await db.select().from(dailyComplianceChecks)
    .where(and(
      eq(dailyComplianceChecks.employeeId, employeeId),
      eq(dailyComplianceChecks.checkDate, checkDate),
    ))
    .limit(10);

  return {
    date: checkDate,
    morningPlan: checks.find(c => c.checkType === "morning_plan") ?? null,
    eveningSummary: checks.find(c => c.checkType === "evening_summary") ?? null,
    nextDayPlan: checks.find(c => c.checkType === "next_day_plan") ?? null,
  };
}

export async function getRules() {
  const db = await requireDb();
  return db.select().from(pointRules)
    .where(eq(pointRules.isActive, true))
    .orderBy(pointRules.category, pointRules.code)
    .limit(100);
}

/**
 * Update a point rule's configuration — all levels/multipliers are adjustable.
 * After update, the system immediately applies the new values on next trigger.
 */
export async function updateRule(input: {
  code: string;
  points?: number;
  roleMultipliers?: Record<string, number>;
  maxPerDay?: number;
  maxPerMonth?: number;
  isActive?: boolean;
}) {
  const db = await requireDb();

  const [existing] = await db.select().from(pointRules)
    .where(eq(pointRules.code, input.code))
    .limit(1);

  if (!existing) throw new Error(`规则 ${input.code} 不存在`);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (input.points !== undefined) updates.points = input.points;
  if (input.roleMultipliers !== undefined) updates.roleMultipliers = input.roleMultipliers;
  if (input.maxPerDay !== undefined) updates.maxPerDay = input.maxPerDay;
  if (input.maxPerMonth !== undefined) updates.maxPerMonth = input.maxPerMonth;
  if (input.isActive !== undefined) updates.isActive = input.isActive;

  await db.update(pointRules)
    .set(updates)
    .where(eq(pointRules.code, input.code));

  log.info({ code: input.code, updates: Object.keys(updates) }, "Point rule updated");
  return { success: true, code: input.code };
}

export async function getRedemptionCatalog() {
  const db = await requireDb();
  return db.select().from(pointRedemptionCatalog)
    .where(eq(pointRedemptionCatalog.isActive, true))
    .orderBy(pointRedemptionCatalog.pointsCost)
    .limit(50);
}

export async function getMyRedemptions(employeeId: number) {
  const db = await requireDb();
  return db.select().from(pointRedemptions)
    .where(eq(pointRedemptions.employeeId, employeeId))
    .orderBy(desc(pointRedemptions.createdAt))
    .limit(50);
}

export async function getPendingRedemptions() {
  const db = await requireDb();
  const rows = await db.execute(sql`
    SELECT pr.*, COALESCE(e.name, CONCAT('员工#', pr.employee_id)) AS employee_name,
           prc.name AS catalog_name
    FROM point_redemptions pr
    LEFT JOIN hrm_employees e ON e.id = pr.employee_id
    LEFT JOIN point_redemption_catalog prc ON prc.id = pr.catalog_item_id
    WHERE pr.status = 'pending'
    ORDER BY pr.created_at ASC
    LIMIT 100
  `);
  return rows.rows;
}

export async function getObservationList() {
  const db = await requireDb();
  const rows = await db.execute(sql`
    SELECT pb.employee_id, pb.current_balance, pb.is_on_observation, pb.is_excellence_suspended,
           pb.excellence_suspended_until,
           COALESCE(e.name, CONCAT('员工#', pb.employee_id)) AS employee_name,
           COALESCE(e.department, '') AS department
    FROM point_balances pb
    LEFT JOIN hrm_employees e ON e.id = pb.employee_id
    WHERE pb.is_on_observation = true OR pb.is_excellence_suspended = true
    ORDER BY pb.current_balance ASC
    LIMIT 100
  `);
  return rows.rows;
}

// ══════════════════════════════════════════════════════════
// 7. Performance-Based Auto-Points (绩效联动)
// ══════════════════════════════════════════════════════════

/**
 * Monthly performance evaluation → auto-award points.
 * Called by scheduler after monthly KPI scores are finalized.
 *
 * Rules:
 *   - KPI ≥ 85 → +200pts
 *   - KPI < 60 → -50pts (with role multiplier)
 *   - 3 consecutive months of ≥20% improvement → +50pts
 *   - 3 consecutive months of ≥20% decline → -100pts (with role multiplier)
 */
export async function evaluateMonthlyPerformancePoints(period: string) {
  const db = await requireDb();

  // Get all employees with KPI scores for this period
  const scores = await db.execute(sql`
    SELECT pcs.employee_id, pcs.composite_score,
           COALESCE(e.role, 'employee') AS role
    FROM perf_composite_scores pcs
    LEFT JOIN users e ON e.id = pcs.employee_id
    WHERE pcs.period = ${period}
      AND pcs.status IN ('finalized', 'locked', 'calibrated')
    LIMIT 500
  `);

  let processed = 0;
  for (const row of scores.rows as { employee_id: number; composite_score: number; role: string }[]) {
    const employeeId = Number(row.employee_id);
    const score = Number(row.composite_score);
    const role = String(row.role || "employee");

    // KPI ≥ 85 → +200pts
    if (score >= 85) {
      await awardPoints({
        employeeId,
        ruleCode: "perf_kpi_above_85",
        description: `${period} KPI ${score}分 ≥ 85，奖励200分`,
        sourceType: "perf_composite",
        sourceId: period,
        employeeRole: role,
      });
    }

    // KPI < 60 → -50pts
    if (score < 60) {
      await awardPoints({
        employeeId,
        ruleCode: "perf_kpi_below_60",
        description: `${period} KPI ${score}分 < 60，扣50分`,
        sourceType: "perf_composite",
        sourceId: period,
        employeeRole: role,
      });
    }

    // Check 3-month consecutive trend
    const [yr, mo] = period.split("-").map(Number);
    const prevPeriods = [
      `${mo <= 2 ? yr - 1 : yr}-${String(mo <= 2 ? mo + 10 : mo - 2).padStart(2, "0")}`,
      `${mo <= 1 ? yr - 1 : yr}-${String(mo <= 1 ? mo + 11 : mo - 1).padStart(2, "0")}`,
    ];

    const history = await db.execute(sql`
      SELECT period, composite_score
      FROM perf_composite_scores
      WHERE employee_id = ${employeeId}
        AND period IN (${prevPeriods[0]}, ${prevPeriods[1]}, ${period})
        AND status IN ('finalized', 'locked', 'calibrated')
      ORDER BY period ASC
      LIMIT 3
    `);

    const histRows = history.rows as { period: string; composite_score: number }[];
    if (histRows.length === 3) {
      const s0 = Number(histRows[0].composite_score);
      const s1 = Number(histRows[1].composite_score);
      const s2 = Number(histRows[2].composite_score);

      // Check 3 consecutive months of ≥20% improvement
      if (s0 > 0 && s1 > 0) {
        const imp1 = (s1 - s0) / s0;
        const imp2 = (s2 - s1) / s1;
        if (imp1 >= 0.20 && imp2 >= 0.20) {
          await awardPoints({
            employeeId,
            ruleCode: "perf_3month_improvement",
            description: `连续3月绩效提升20%+ (${s0}→${s1}→${s2})`,
            sourceType: "perf_trend",
            sourceId: period,
            employeeRole: role,
          });
        }
        // Check 3 consecutive months of ≥20% decline
        const dec1 = (s0 - s1) / s0;
        const dec2 = (s1 - s2) / s1;
        if (dec1 >= 0.20 && dec2 >= 0.20) {
          await awardPoints({
            employeeId,
            ruleCode: "perf_3month_decline",
            description: `连续3月绩效下降20%+ (${s0}→${s1}→${s2})`,
            sourceType: "perf_trend",
            sourceId: period,
            employeeRole: role,
          });
        }
      }
    }

    processed++;
  }

  log.info({ period, processed }, "Monthly performance points evaluation completed");
  return { period, processed };
}

// ══════════════════════════════════════════════════════════
// 8. Monthly Stats
// ══════════════════════════════════════════════════════════

export async function getMonthlyStats(employeeId: number, period: string) {
  const db = await requireDb();
  const monthPrefix = period; // YYYY-MM

  const [stats] = await db.select({
    totalAwarded: sql<number>`COALESCE(SUM(CASE WHEN type = 'award' THEN points ELSE 0 END), 0)`,
    totalPenalties: sql<number>`COALESCE(SUM(CASE WHEN type = 'penalty' THEN ABS(points) ELSE 0 END), 0)`,
    totalRedeemed: sql<number>`COALESCE(SUM(CASE WHEN type = 'redeem' THEN ABS(points) ELSE 0 END), 0)`,
    transactionCount: sql<number>`COUNT(*)`,
  })
    .from(pointTransactions)
    .where(and(
      eq(pointTransactions.employeeId, employeeId),
      sql`${pointTransactions.transactionDate} LIKE ${monthPrefix + '%'}`,
    ));

  // Compliance rate for the month
  const [compliance] = await db.select({
    totalChecks: sql<number>`COUNT(*)`,
    passedChecks: sql<number>`COALESCE(SUM(CASE WHEN passed = true THEN 1 ELSE 0 END), 0)`,
  })
    .from(dailyComplianceChecks)
    .where(and(
      eq(dailyComplianceChecks.employeeId, employeeId),
      sql`${dailyComplianceChecks.checkDate} LIKE ${monthPrefix + '%'}`,
    ));

  return {
    period: monthPrefix,
    totalAwarded: stats?.totalAwarded ?? 0,
    totalPenalties: stats?.totalPenalties ?? 0,
    totalRedeemed: stats?.totalRedeemed ?? 0,
    transactionCount: stats?.transactionCount ?? 0,
    netPoints: (stats?.totalAwarded ?? 0) - (stats?.totalPenalties ?? 0) - (stats?.totalRedeemed ?? 0),
    complianceRate: (compliance?.totalChecks ?? 0) > 0
      ? Math.round(((compliance?.passedChecks ?? 0) / (compliance?.totalChecks ?? 1)) * 100)
      : 100,
    totalChecks: compliance?.totalChecks ?? 0,
    passedChecks: compliance?.passedChecks ?? 0,
  };
}

// ══════════════════════════════════════════════════════════
// 9. Announcement Template Engine — 通报模板引擎
// ══════════════════════════════════════════════════════════

/**
 * Announcement scope determines who receives the notification:
 * - company_wide: all active employees
 * - department: same department only
 * - bu: same business unit only
 * - manager_chain: direct manager + director + CEO
 */
type AnnouncementScope = "company_wide" | "department" | "bu" | "manager_chain";

interface AnnouncementTemplate {
  title: string;
  message: string;
  scope: AnnouncementScope;
  notificationType: string;   // notification table 'type' field
  priority: "normal" | "high" | "urgent";
}

/** Look up employee info for announcement content */
async function getEmployeeInfo(db: { execute: (query: SQL) => Promise<{ rows: unknown[] }> }, employeeId: number) {
  const rows = await db.execute(sql`
    SELECT id, name, department, role, bu_id
    FROM employees WHERE id = ${employeeId} LIMIT 1
  `);
  const emp = (rows.rows as { name?: string; department?: string; role?: string; bu_id?: number | null }[])[0];
  return {
    name: emp?.name ?? `员工#${employeeId}`,
    department: emp?.department ?? "未知部门",
    role: emp?.role ?? "employee",
    buId: emp?.bu_id ?? null,
  };
}

/** Build template for each scenario */
function buildAnnouncementTemplate(
  scenario: string,
  empName: string,
  empDept: string,
  balance: number,
  threshold: number,
): AnnouncementTemplate {
  const today = new Date().toISOString().slice(0, 10);

  switch (scenario) {
    // ── Honor Milestones ────────────────────────────
    case "honor_10k":
      return {
        title: `【通报表彰】${empName} 积分突破10,000分`,
        message: [
          `━━━━━━ GRT集团积分通报表彰 ━━━━━━`,
          ``,
          `${empDept} ${empName} 同事积分累计达到 10,000 分！`,
          ``,
          `该同事在日常工作合规、任务交付质量、团队协作等方面`,
          `持续表现优异，积极践行GRT"高标准高期望高回报"理念。`,
          ``,
          `特此全员通报表彰，号召全体同事向其学习！`,
          ``,
          `当前积分: ${balance.toLocaleString()} 分`,
          `日期: ${today}`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        ].join("\n"),
        scope: "company_wide",
        notificationType: "honor_announcement",
        priority: "high",
      };

    case "honor_20k":
      return {
        title: `【特别通报表彰】${empName} 积分突破20,000分`,
        message: [
          `━━━━━━ GRT集团特别通报表彰 ━━━━━━`,
          ``,
          `热烈祝贺！${empDept} ${empName} 同事积分达到 20,000 分！`,
          ``,
          `该同事长期保持卓越的工作表现，在绩效、创新、团队建设`,
          `等方面做出了突出贡献，是GRT企业文化的杰出践行者。`,
          ``,
          `经公司管理层研究决定，授予该同事"GRT卓越员工"荣誉称号。`,
          ``,
          `当前积分: ${balance.toLocaleString()} 分`,
          `日期: ${today}`,
          ``,
          `GRT集团管理层`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        ].join("\n"),
        scope: "company_wide",
        notificationType: "honor_announcement",
        priority: "urgent",
      };

    // ── Warning Milestones ──────────────────────────
    case "warning_neg5k":
      return {
        title: `【通报警示】${empName} 积分跌至-5,000分以下`,
        message: [
          `━━━━━━ GRT集团积分通报警示 ━━━━━━`,
          ``,
          `${empDept} ${empName} 同事积分已跌至 ${balance.toLocaleString()} 分。`,
          ``,
          `该同事在考勤纪律、任务完成、职场规范等方面`,
          `存在严重不足，经系统自动评估触发通报警示。`,
          ``,
          `请该同事所在部门负责人于3个工作日内约谈并制定改善计划，`,
          `改善计划需提交人力资源部备案。`,
          ``,
          `日期: ${today}`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        ].join("\n"),
        scope: "company_wide",
        notificationType: "warning_announcement",
        priority: "high",
      };

    case "warning_neg10k":
      return {
        title: `【严重通报警示】${empName} 积分跌至-10,000分以下`,
        message: [
          `━━━━━━ GRT集团严重通报警示 ━━━━━━`,
          ``,
          `${empDept} ${empName} 同事积分已跌至 ${balance.toLocaleString()} 分。`,
          ``,
          `该同事多项考核指标严重不达标，已触发公司最高级别积分警示。`,
          ``,
          `处置措施:`,
          `1. 部门负责人须在2个工作日内提交书面情况说明`,
          `2. 人力资源部将启动专项评估程序`,
          `3. 管理层将根据评估结果决定后续处置方案`,
          ``,
          `日期: ${today}`,
          `GRT集团管理层`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        ].join("\n"),
        scope: "company_wide",
        notificationType: "warning_announcement",
        priority: "urgent",
      };

    // ── Existing threshold actions (internal, not company-wide) ──
    case "suspend_excellence":
      return {
        title: `积分预警: ${empName} 评优资格暂停`,
        message: `${empDept} ${empName} 积分 ${balance} 低于500分，评优资格暂停6个月。请关注工作表现改善。`,
        scope: "manager_chain",
        notificationType: "threshold_warning",
        priority: "normal",
      };

    case "observation_list":
      return {
        title: `积分预警: ${empName} 进入观察名录`,
        message: [
          `${empDept} ${empName} 积分 ${balance} 低于0分，已进入观察名录。`,
          `请部门经理在3个工作日内完成约谈并制定改善计划。`,
        ].join("\n"),
        scope: "department",
        notificationType: "threshold_warning",
        priority: "high",
      };

    default:
      return {
        title: `积分通知: ${empName}`,
        message: `${empName} 积分变动通知，当前余额 ${balance} 分。`,
        scope: "manager_chain",
        notificationType: "threshold_info",
        priority: "normal",
      };
  }
}

/** Determine scenario key from action + threshold */
function resolveScenario(action: string, threshold: number): string {
  if (action === "company_announcement_honor") {
    if (threshold >= 20000) return "honor_20k";
    return "honor_10k";
  }
  if (action === "company_announcement_warning") {
    if (threshold <= -10000) return "warning_neg10k";
    return "warning_neg5k";
  }
  return action; // suspend_excellence, observation_list, etc.
}

/** Publish milestone announcement with full template */
async function publishMilestoneAnnouncement(
  db: { execute: (query: SQL) => Promise<{ rows: unknown[] }> },
  employeeId: number,
  currentBalance: number,
  threshold: number,
  action: string,
) {
  const empInfo = await getEmployeeInfo(db, employeeId);
  const scenario = resolveScenario(action, threshold);
  const tpl = buildAnnouncementTemplate(scenario, empInfo.name, empInfo.department, currentBalance, threshold);

  // Determine recipient SQL based on scope
  let recipientSql: string;
  switch (tpl.scope) {
    case "company_wide":
      recipientSql = `SELECT id FROM employees WHERE status = 'active' LIMIT 500`;
      break;
    case "department":
      recipientSql = `SELECT id FROM employees WHERE status = 'active' AND department = '${empInfo.department}' LIMIT 200`;
      break;
    case "bu":
      recipientSql = empInfo.buId
        ? `SELECT id FROM employees WHERE status = 'active' AND bu_id = ${empInfo.buId} LIMIT 200`
        : `SELECT id FROM employees WHERE status = 'active' AND department = '${empInfo.department}' LIMIT 200`;
      break;
    case "manager_chain":
      recipientSql = `SELECT id FROM employees WHERE status = 'active' AND (role IN ('manager','director','ceo','bu_gm') OR department = '${empInfo.department}') LIMIT 50`;
      break;
    default:
      recipientSql = `SELECT id FROM employees WHERE status = 'active' LIMIT 500`;
  }

  await db.execute(sql.raw(`
    INSERT INTO notifications (user_id, type, title, message, created_at)
    SELECT e.id, '${tpl.notificationType}',
      '${tpl.title.replace(/'/g, "''")}',
      '${tpl.message.replace(/'/g, "''")}',
      NOW()
    FROM (${recipientSql}) e
  `));

  log.info({
    employeeId,
    scenario,
    scope: tpl.scope,
    priority: tpl.priority,
    threshold,
    balance: currentBalance,
  }, "Milestone announcement published");

  // Also post to company community feed
  try {
    await postToCommunity({
      postType: tpl.priority === "urgent" || tpl.priority === "high" ? "announcement" : "notice",
      title: tpl.title,
      content: tpl.message,
      scope: tpl.scope,
      priority: tpl.priority,
      sourceType: "milestone_announcement",
      sourceId: `emp_${employeeId}_threshold_${threshold}`,
      isPinned: tpl.priority === "urgent",
      requiresAck: tpl.priority === "urgent" || tpl.priority === "high",
    });
  } catch (e) {
    log.warn({ employeeId, scenario, error: e }, "Failed to post milestone to community (non-fatal)");
  }
}

// ══════════════════════════════════════════════════════════
// 10. Suggestion Channel — 合理化建议通道
// ══════════════════════════════════════════════════════════

import {
  suggestionSubmissions,
  pointApprovalRequests,
  communityPosts,
  communitySensitiveWords,
  communityAcks,
} from "../../drizzle/employee-points-schema";

const VALUE_TIER_RULE: Record<string, string> = {
  effective: "suggestion_effective",     // 50pts
  outstanding: "suggestion_outstanding", // 500pts
  major: "suggestion_major",             // 5000pts
};

/** Submit a new suggestion */
export async function submitSuggestion(input: {
  employeeId: number;
  title: string;
  description: string;
  problemStatement?: string;
  expectedBenefit?: string;
  implementationPlan?: string;
  estimatedSavings?: string;
  targetDepartment?: string;
  category?: string;
}) {
  const db = await requireDb();
  const [row] = await db.insert(suggestionSubmissions).values({
    employeeId: input.employeeId,
    title: input.title,
    description: input.description,
    problemStatement: input.problemStatement,
    expectedBenefit: input.expectedBenefit,
    implementationPlan: input.implementationPlan,
    estimatedSavings: input.estimatedSavings,
    targetDepartment: input.targetDepartment,
    category: input.category ?? "process",
    status: "submitted",
  }).returning();
  log.info({ suggestionId: row.id, employeeId: input.employeeId }, "Suggestion submitted");
  return row;
}

/** List suggestions (with filters) */
export async function listSuggestions(filters?: {
  employeeId?: number;
  status?: string;
  category?: string;
  limit?: number;
}) {
  const db = await requireDb();
  const conditions: (SQL | undefined)[] = [];
  if (filters?.employeeId) conditions.push(eq(suggestionSubmissions.employeeId, filters.employeeId));
  if (filters?.status) conditions.push(sql`${suggestionSubmissions.status} = ${filters.status}`);
  if (filters?.category) conditions.push(eq(suggestionSubmissions.category, filters.category));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(suggestionSubmissions)
    .where(where)
    .orderBy(desc(suggestionSubmissions.createdAt))
    .limit(filters?.limit ?? 100);
}

/** Get single suggestion by ID */
export async function getSuggestion(id: number) {
  const db = await requireDb();
  const [row] = await db.select().from(suggestionSubmissions)
    .where(eq(suggestionSubmissions.id, id)).limit(1);
  if (!row) throw new Error("Suggestion not found");
  return row;
}

/** Evaluate suggestion — department manager sets value tier */
export async function evaluateSuggestion(input: {
  id: number;
  evaluatorId: number;
  valueTier: "effective" | "outstanding" | "major" | "rejected";
  evaluatorNotes?: string;
}) {
  const db = await requireDb();

  const status = input.valueTier === "rejected" ? "rejected" as const : input.valueTier === "major" || input.valueTier === "outstanding"
    ? "under_review" as const // outstanding/major need CEO approval
    : "effective" as const;   // effective → auto-approved by manager

  const [updated] = await db.update(suggestionSubmissions)
    .set({
      status,
      evaluatorId: input.evaluatorId,
      evaluatorNotes: input.evaluatorNotes,
      evaluatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(suggestionSubmissions.id, input.id))
    .returning();

  // If effective → auto-award points + auto-announce
  if (status === "effective" && updated) {
    await awardSuggestionPoints(updated.id, updated.employeeId, "effective");
    await publishSuggestionAnnouncement(updated.id);
  }

  log.info({ suggestionId: input.id, tier: input.valueTier, status }, "Suggestion evaluated");
  return updated;
}

/** CEO approves outstanding/major suggestion */
export async function approveSuggestion(input: {
  id: number;
  approvedBy: number;
  approvalNotes?: string;
}) {
  const db = await requireDb();

  // Get current suggestion to determine tier
  const [suggestion] = await db.select().from(suggestionSubmissions)
    .where(eq(suggestionSubmissions.id, input.id)).limit(1);
  if (!suggestion) throw new Error("Suggestion not found");
  if (suggestion.status !== "under_review") throw new Error("Suggestion not in under_review status");

  // Determine tier from evaluator's assessment
  const tier: "major" | "outstanding" = suggestion.evaluatorNotes?.includes("重大") ? "major" : "outstanding";

  const [updated] = await db.update(suggestionSubmissions)
    .set({
      status: tier,
      approvedBy: input.approvedBy,
      approvedAt: new Date(),
      approvalNotes: input.approvalNotes,
      updatedAt: new Date(),
    })
    .where(eq(suggestionSubmissions.id, input.id))
    .returning();

  // Award points + announce
  if (updated) {
    await awardSuggestionPoints(updated.id, updated.employeeId, tier);
    await publishSuggestionAnnouncement(updated.id);
  }

  log.info({ suggestionId: input.id, tier, approvedBy: input.approvedBy }, "Suggestion approved by CEO");
  return updated;
}

/** Internal: award points for approved suggestion */
async function awardSuggestionPoints(
  suggestionId: number,
  employeeId: number,
  tier: "effective" | "outstanding" | "major",
) {
  const ruleCode = VALUE_TIER_RULE[tier];
  if (!ruleCode) return;

  try {
    const result = await awardPoints({
      employeeId,
      ruleCode,
      description: `合理化建议(${tier === "effective" ? "有效" : tier === "outstanding" ? "突出价值" : "重大价值"})获采纳`,
      sourceType: "suggestion",
      sourceId: String(suggestionId),
    });

    // Update suggestion with points awarded
    const db = await requireDb();
    await db.update(suggestionSubmissions)
      .set({ pointsAwarded: result.points, updatedAt: new Date() })
      .where(eq(suggestionSubmissions.id, suggestionId));

    return result;
  } catch (e) {
    log.warn({ suggestionId, employeeId, tier, error: e }, "Failed to award suggestion points");
  }
}

/** Internal: auto-publish announcement for approved suggestion */
async function publishSuggestionAnnouncement(suggestionId: number) {
  const db = await requireDb();

  const [suggestion] = await db.select().from(suggestionSubmissions)
    .where(eq(suggestionSubmissions.id, suggestionId)).limit(1);
  if (!suggestion || suggestion.announcementPublished) return;

  try {
    const tierLabel = suggestion.status === "major" ? "重大价值建议"
      : suggestion.status === "outstanding" ? "突出价值建议"
      : "有效建议";

    const empInfo = await getEmployeeInfo(db, suggestion.employeeId);
    const today = new Date().toISOString().slice(0, 10);
    const points = suggestion.pointsAwarded ?? 0;

    // Scope: major→company_wide, outstanding→company_wide, effective→department
    const isMajorOrOutstanding = suggestion.status === "major" || suggestion.status === "outstanding";

    const title = `【合理化建议${isMajorOrOutstanding ? "特别" : ""}公告】${empInfo.name} — ${suggestion.title}`;
    const message = [
      isMajorOrOutstanding
        ? `━━━━━━ GRT集团合理化建议特别公告 ━━━━━━`
        : `━━━━━━ GRT集团合理化建议公告 ━━━━━━`,
      ``,
      `${empInfo.department} ${empInfo.name} 同事提交的${tierLabel}已被采纳:`,
      ``,
      `建议标题: ${suggestion.title}`,
      suggestion.expectedBenefit ? `预期收益: ${suggestion.expectedBenefit}` : null,
      suggestion.estimatedSavings ? `预计节省: ¥${Number(suggestion.estimatedSavings).toLocaleString()}` : null,
      ``,
      `奖励积分: +${points.toLocaleString()} 分`,
      ``,
      isMajorOrOutstanding
        ? `公司鼓励每位员工积极提出改善建议，为公司创造更大价值！`
        : `感谢该同事为部门工作改善做出的贡献！`,
      ``,
      `日期: ${today}`,
      isMajorOrOutstanding ? `GRT集团管理层` : null,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ].filter(Boolean).join("\n");

    const recipientFilter = isMajorOrOutstanding
      ? sql`status = 'active'`
      : sql`status = 'active' AND department = ${empInfo.department}`;

    await db.execute(sql`
      INSERT INTO notifications (user_id, type, title, message, created_at)
      SELECT id, 'suggestion_announcement',
        ${title}, ${message}, NOW()
      FROM employees
      WHERE ${recipientFilter}
      LIMIT 500
    `);

    await db.update(suggestionSubmissions)
      .set({ announcementPublished: true, updatedAt: new Date() })
      .where(eq(suggestionSubmissions.id, suggestionId));

    // Also post to company community feed
    try {
      await postToCommunity({
        postType: "announcement",
        title,
        content: message,
        scope: isMajorOrOutstanding ? "company_wide" : "department",
        scopeValue: isMajorOrOutstanding ? undefined : empInfo.department,
        priority: isMajorOrOutstanding ? "high" : "normal",
        sourceType: "suggestion_announcement",
        sourceId: `suggestion_${suggestionId}`,
        isPinned: isMajorOrOutstanding,
        requiresAck: isMajorOrOutstanding,
      });
    } catch (communityErr) {
      log.warn({ suggestionId, error: communityErr }, "Failed to post suggestion to community (non-fatal)");
    }

    log.info({ suggestionId, tier: tierLabel, scope: isMajorOrOutstanding ? "company_wide" : "department" }, "Suggestion announcement published");
  } catch (e) {
    log.warn({ suggestionId, error: e }, "Failed to publish suggestion announcement (non-fatal)");
  }
}

/** Get suggestion stats (for dashboard) */
export async function getSuggestionStats() {
  const db = await requireDb();
  try {
    const rows = await db.select().from(suggestionSubmissions).limit(1000);
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalPoints = 0;
    for (const r of rows) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
      totalPoints += r.pointsAwarded ?? 0;
    }
    return { total: rows.length, byStatus, byCategory, totalPointsAwarded: totalPoints };
  } catch {
    return { total: 0, byStatus: {}, byCategory: {}, totalPointsAwarded: 0 };
  }
}

// ══════════════════════════════════════════════════════════
// 10. Manager Workspace — 经理工作区积分填报
// ══════════════════════════════════════════════════════════

/** Approval threshold: abs(points) > this requires superior approval */
const APPROVAL_THRESHOLD = 100;

/**
 * Manager report: award/penalize from workspace.
 * - |points| ≤ 100 → auto-execute
 * - |points| > 100 → create approval request, wait for superior
 */
export async function managerReport(input: {
  requesterId: number;
  targetEmployeeId: number;
  ruleCode?: string;
  points: number;
  description: string;
  sourceType?: string;
  sourceId?: string;
}) {
  const absPoints = Math.abs(input.points);

  if (absPoints <= APPROVAL_THRESHOLD) {
    // Auto-execute: manager can directly award/penalize ≤100 points
    const result = await awardPoints({
      employeeId: input.targetEmployeeId,
      ruleCode: input.ruleCode ?? (input.points >= 0 ? "manager_award" : "manager_penalty"),
      pointsOverride: input.points,
      description: input.description,
      sourceType: input.sourceType ?? "manager_report",
      sourceId: input.sourceId,
      grantedBy: input.requesterId,
    });
    log.info({ requesterId: input.requesterId, targetId: input.targetEmployeeId, points: input.points }, "Manager auto-executed point report (≤100)");
    return { action: "executed", points: result.points, needsApproval: false };
  }

  // >100 points → create approval request
  const db = await requireDb();
  const [request] = await db.insert(pointApprovalRequests).values({
    requesterId: input.requesterId,
    targetEmployeeId: input.targetEmployeeId,
    ruleCode: input.ruleCode ?? (input.points >= 0 ? "manager_award" : "manager_penalty"),
    requestedPoints: input.points,
    description: input.description,
    sourceType: input.sourceType ?? "manager_report",
    sourceId: input.sourceId,
    status: "pending",
  }).returning();

  log.info({ requestId: request.id, requesterId: input.requesterId, points: input.points }, "Point approval request created (>100, needs superior)");
  return { action: "pending_approval", requestId: request.id, needsApproval: true };
}

/** List pending approval requests (for superiors) */
export async function listPendingApprovals(approverId?: number) {
  const db = await requireDb();
  return db.select().from(pointApprovalRequests)
    .where(eq(pointApprovalRequests.status, "pending"))
    .orderBy(desc(pointApprovalRequests.createdAt))
    .limit(100);
}

/** Approve a point request — execute the points */
export async function approvePointRequest(input: {
  requestId: number;
  approverId: number;
  notes?: string;
}) {
  const db = await requireDb();

  const [request] = await db.select().from(pointApprovalRequests)
    .where(eq(pointApprovalRequests.id, input.requestId)).limit(1);
  if (!request) throw new Error("Approval request not found");
  if (request.status !== "pending") throw new Error("Request already processed");

  // Execute the points
  await awardPoints({
    employeeId: request.targetEmployeeId,
    ruleCode: request.ruleCode ?? "manager_award",
    pointsOverride: request.requestedPoints,
    description: request.description ?? "",
    sourceType: "approval",
    sourceId: String(request.id),
    grantedBy: input.approverId,
  });

  // Update request status
  const [updated] = await db.update(pointApprovalRequests)
    .set({
      status: "approved",
      approvedBy: input.approverId,
      approvedAt: new Date(),
      approvalNotes: input.notes,
      pointsApplied: true,
      updatedAt: new Date(),
    })
    .where(eq(pointApprovalRequests.id, input.requestId))
    .returning();

  log.info({ requestId: input.requestId, approverId: input.approverId, points: request.requestedPoints }, "Point request approved and executed");
  return updated;
}

/** Reject a point request */
export async function rejectPointRequest(input: {
  requestId: number;
  approverId: number;
  notes?: string;
}) {
  const db = await requireDb();

  const [updated] = await db.update(pointApprovalRequests)
    .set({
      status: "rejected",
      approvedBy: input.approverId,
      approvedAt: new Date(),
      approvalNotes: input.notes,
      updatedAt: new Date(),
    })
    .where(eq(pointApprovalRequests.id, input.requestId))
    .returning();

  log.info({ requestId: input.requestId, approverId: input.approverId }, "Point request rejected");
  return updated;
}

/**
 * Evaluate monthly sales M2 pipeline — penalize sales staff who fail to
 * bring ≥3 new customers to M2 stage for 2+ consecutive months.
 * Month 1-2 shortfall: -500 (on month 2)
 * Month 3+: doubles each month (-1000, -2000, -4000, ...)
 */
export async function evaluateSalesM2Pipeline(period: string) {
  const db = await requireDb();

  // Get all sales-role employees
  const salesStaff = await db.execute(sql`
    SELECT e.id AS employee_id, e.role
    FROM employees e
    WHERE e.role IN ('sales', 'bu_sales', 'sales_engineer')
      AND e.status = 'active'
    LIMIT 500
  `);

  let processed = 0;
  for (const emp of salesStaff.rows as { employee_id: number; role: string }[]) {
    const employeeId = emp.employee_id;

    // Count new customers reaching M2 stage this month
    const [result] = await db.execute(sql`
      SELECT COUNT(*) AS m2_count
      FROM leads
      WHERE owner_id = ${employeeId}
        AND stage = 'M2'
        AND TO_CHAR(updated_at, 'YYYY-MM') = ${period}
    `).then(r => r.rows as { m2_count: number }[]);

    const m2Count = Number(result?.m2_count ?? 0);

    if (m2Count >= 3) continue; // Met target, no penalty

    // Check how many consecutive months they've been below target
    const [yr, mo] = period.split("-").map(Number);
    let consecutiveMonths = 1;
    for (let i = 1; i <= 6; i++) {
      const checkMo = mo - i;
      const checkPeriod = checkMo <= 0
        ? `${yr - 1}-${String(checkMo + 12).padStart(2, "0")}`
        : `${yr}-${String(checkMo).padStart(2, "0")}`;

      const [prev] = await db.execute(sql`
        SELECT COUNT(*) AS m2_count
        FROM leads
        WHERE owner_id = ${employeeId}
          AND stage = 'M2'
          AND TO_CHAR(updated_at, 'YYYY-MM') = ${checkPeriod}
      `).then(r => r.rows as { m2_count: number }[]);

      if (Number(prev?.m2_count ?? 0) >= 3) break;
      consecutiveMonths++;
    }

    if (consecutiveMonths >= 2) {
      if (consecutiveMonths === 2) {
        // First penalty: -500
        await awardPoints({
          employeeId,
          ruleCode: "sales_m2_shortfall_initial",
          description: `连续${consecutiveMonths}个月新客户M2不足3个 (本月${m2Count}个)`,
          sourceType: "sales_m2_eval",
          sourceId: period,
        });
      } else {
        // Escalating: doubles from -1000 base → -1000, -2000, -4000, ...
        const multiplier = Math.pow(2, consecutiveMonths - 3); // month3=1x, month4=2x, month5=4x
        const penalty = -1000 * multiplier;
        await awardPoints({
          employeeId,
          ruleCode: "sales_m2_shortfall_escalate",
          pointsOverride: penalty,
          description: `连续${consecutiveMonths}个月新客户M2不足3个，翻倍处罚 (${penalty}分)`,
          sourceType: "sales_m2_eval",
          sourceId: period,
        });
      }
    }

    processed++;
  }

  log.info({ period, processed }, "Sales M2 pipeline evaluation completed");
  return { period, processed };
}

/** Get my submitted requests (for managers to track their reports) */
export async function getMyApprovalRequests(requesterId: number) {
  const db = await requireDb();
  return db.select().from(pointApprovalRequests)
    .where(eq(pointApprovalRequests.requesterId, requesterId))
    .orderBy(desc(pointApprovalRequests.createdAt))
    .limit(100);
}

// ══════════════════════════════════════════════════════════
// 12. Company Community — 公司社区
// ══════════════════════════════════════════════════════════

/** Load sensitive words from DB (cached for 5min) */
let sensitiveWordsCache: { words: { word: string; category: string; action: string; replacement: string }[]; ts: number } | null = null;

async function loadSensitiveWords() {
  if (sensitiveWordsCache && Date.now() - sensitiveWordsCache.ts < 300_000) {
    return sensitiveWordsCache.words;
  }
  const db = await requireDb();
  const rows = await db.select().from(communitySensitiveWords)
    .where(eq(communitySensitiveWords.isActive, true))
    .limit(500);
  sensitiveWordsCache = {
    words: rows.map(r => ({ word: r.word, category: r.category, action: r.action, replacement: r.replacement })),
    ts: Date.now(),
  };
  return sensitiveWordsCache.words;
}

/**
 * Check text against sensitive words.
 * Returns: { clean, filtered, blocked, flagged }
 */
export async function filterSensitiveContent(text: string): Promise<{
  clean: boolean;
  filteredText: string;
  blockedWords: string[];
  flaggedWords: string[];
  maskedWords: string[];
}> {
  const words = await loadSensitiveWords();
  let filtered = text;
  const blocked: string[] = [];
  const flagged: string[] = [];
  const masked: string[] = [];

  for (const sw of words) {
    if (filtered.includes(sw.word)) {
      switch (sw.action) {
        case "block":
          blocked.push(sw.word);
          break;
        case "mask":
          filtered = filtered.replaceAll(sw.word, sw.replacement);
          masked.push(sw.word);
          break;
        case "flag":
          flagged.push(sw.word);
          break;
      }
    }
  }

  return {
    clean: blocked.length === 0 && masked.length === 0,
    filteredText: filtered,
    blockedWords: blocked,
    flaggedWords: flagged,
    maskedWords: masked,
  };
}

/** Create a community post (user-generated, with sensitive word check) */
export async function createCommunityPost(input: {
  authorId: number;
  postType: string;
  title: string;
  content: string;
  scope?: string;
  scopeValue?: string;
  requiresAck?: boolean;
}) {
  const db = await requireDb();

  // Check sensitive words
  const titleCheck = await filterSensitiveContent(input.title);
  const contentCheck = await filterSensitiveContent(input.content);

  if (titleCheck.blockedWords.length > 0 || contentCheck.blockedWords.length > 0) {
    const allBlocked = [...titleCheck.blockedWords, ...contentCheck.blockedWords];
    throw new Error(`内容包含违禁词，无法发布: ${allBlocked.join("、")}`);
  }

  const [post] = await db.insert(communityPosts).values({
    authorId: input.authorId,
    postType: input.postType as "announcement" | "notice" | "discussion" | "achievement" | "suggestion_share" | "knowledge",
    title: titleCheck.filteredText,
    content: contentCheck.filteredText,
    contentClean: titleCheck.clean && contentCheck.clean,
    scope: input.scope ?? "company_wide",
    scopeValue: input.scopeValue,
    requiresAck: input.requiresAck ?? false,
  }).returning();

  if (titleCheck.flaggedWords.length > 0 || contentCheck.flaggedWords.length > 0) {
    log.warn({
      postId: post.id,
      flagged: [...titleCheck.flaggedWords, ...contentCheck.flaggedWords],
    }, "Community post contains flagged words");
  }

  return post;
}

/** System auto-post to community (announcements, notices, etc.) */
export async function postToCommunity(input: {
  postType: string;
  title: string;
  content: string;
  priority?: string;
  scope?: string;
  scopeValue?: string;
  sourceType?: string;
  sourceId?: string;
  isPinned?: boolean;
  requiresAck?: boolean;
}) {
  const db = await requireDb();
  const [post] = await db.insert(communityPosts).values({
    authorId: 0, // system
    postType: input.postType as "announcement" | "notice" | "discussion" | "achievement" | "suggestion_share" | "knowledge",
    title: input.title,
    content: input.content,
    contentClean: true,
    priority: input.priority ?? "normal",
    scope: input.scope ?? "company_wide",
    scopeValue: input.scopeValue,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    isPinned: input.isPinned ?? false,
    requiresAck: input.requiresAck ?? false,
  }).returning();
  log.info({ postId: post.id, type: input.postType, source: input.sourceType }, "System community post created");
  return post;
}

/** List community posts (feed) */
export async function listCommunityPosts(filters?: {
  postType?: string;
  scope?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const conditions: (SQL | undefined)[] = [eq(communityPosts.isActive, true)];
  if (filters?.postType) conditions.push(sql`${communityPosts.postType} = ${filters.postType}`);
  if (filters?.scope) conditions.push(eq(communityPosts.scope, filters.scope));

  return db.select().from(communityPosts)
    .where(and(...conditions))
    .orderBy(desc(communityPosts.isPinned), desc(communityPosts.createdAt))
    .limit(filters?.limit ?? 50)
    .offset(filters?.offset ?? 0);
}

/** Acknowledge a post (已读确认) */
export async function acknowledgeCommunityPost(postId: number, employeeId: number) {
  const db = await requireDb();
  await db.insert(communityAcks).values({ postId, employeeId });
  await db.update(communityPosts)
    .set({ ackCount: sql`ack_count + 1` })
    .where(eq(communityPosts.id, postId));
  return { success: true };
}

/** Like a post */
export async function likeCommunityPost(postId: number) {
  const db = await requireDb();
  await db.update(communityPosts)
    .set({ likeCount: sql`like_count + 1` })
    .where(eq(communityPosts.id, postId));
  return { success: true };
}

/** Get sensitive words list (admin) */
export async function listSensitiveWords() {
  const db = await requireDb();
  return db.select().from(communitySensitiveWords)
    .orderBy(desc(communitySensitiveWords.createdAt))
    .limit(500);
}

/** Add sensitive word (admin) */
export async function addSensitiveWord(input: {
  word: string;
  category?: string;
  action?: string;
  replacement?: string;
}) {
  const db = await requireDb();
  sensitiveWordsCache = null; // invalidate cache
  const [row] = await db.insert(communitySensitiveWords).values({
    word: input.word,
    category: input.category ?? "custom",
    action: input.action ?? "mask",
    replacement: input.replacement ?? "***",
  }).returning();
  return row;
}

/** Remove sensitive word (admin) */
export async function removeSensitiveWord(id: number) {
  const db = await requireDb();
  sensitiveWordsCache = null;
  await db.update(communitySensitiveWords)
    .set({ isActive: false })
    .where(eq(communitySensitiveWords.id, id));
  return { success: true };
}

/** Get community stats */
export async function getCommunityStats() {
  const db = await requireDb();
  try {
    const rows = await db.select().from(communityPosts)
      .where(eq(communityPosts.isActive, true))
      .limit(1000);
    const byType: Record<string, number> = {};
    let totalViews = 0, totalLikes = 0;
    for (const r of rows) {
      byType[r.postType] = (byType[r.postType] ?? 0) + 1;
      totalViews += r.viewCount;
      totalLikes += r.likeCount;
    }
    return { totalPosts: rows.length, byType, totalViews, totalLikes };
  } catch {
    return { totalPosts: 0, byType: {}, totalViews: 0, totalLikes: 0 };
  }
}

// ══════════════════════════════════════════════════════════
// 13. Elite Benefit System — 精英福利制度 (动态考评循环)
// ══════════════════════════════════════════════════════════
//
// CEO Directive (complete):
//   申请条件: 积分≥5000 + KPI连续6个月≥83 + 技能≥L3 → 大小休3个月
//   升级条件: 大小休期间连续两次高水准交付 → 五天工作制
//   降级规则:
//     1. 连续2个月KPI<80 → 恢复六天制
//     2. 积分降至<5000 → 恢复六天制
//     3. 技能等级降级 → 恢复六天制
//     4. 每次撤销，下次申请评选周期+1个月冷却期
//   承诺机制:
//     - 第1个月KPI<80时，可提交"加强承诺"(非周末加强时间投入)
//     - 承诺后给予2个月改善窗口
//     - 2个月内无明显提升(仍<80) → 强制恢复六天制
//   同适用于: 岗位提升评估
//

import { eliteBenefitApplications, eliteBenefitReviews } from "../../drizzle/employee-points-schema";

/** Eligibility thresholds */
const ELITE_THRESHOLDS = {
  minPoints: 5000,
  minKpiAvg6m: 83,
  minSkillLevel: "L3",
  minHighDeliveryCount: 2,
  alternatingRestDurationMonths: 3,
  // Downgrade thresholds
  kpiDowngradeThreshold: 80,        // KPI < 80 triggers warning
  consecutiveKpiViolationLimit: 2,  // 2 months consecutive → revoke
  commitmentWindowMonths: 2,        // 承诺改善窗口
  baseCooldownMonths: 1,            // 每次撤销的基础冷却期(累加)
};

/** Skill level ordering for comparison */
const SKILL_LEVEL_ORDER: Record<string, number> = {
  L1: 1, L2: 2, L3: 3, L4: 4, L5: 5, L6: 6,
};

function isSkillLevelEligible(level: string | null | undefined): boolean {
  if (!level) return false;
  return (SKILL_LEVEL_ORDER[level.toUpperCase()] ?? 0) >= SKILL_LEVEL_ORDER[ELITE_THRESHOLDS.minSkillLevel];
}

/** Check if employee meets elite benefit eligibility */
export async function checkEliteEligibility(employeeId: number) {
  const db = await requireDb();

  // 1. Point balance
  const [balance] = await db.select().from(pointBalances)
    .where(eq(pointBalances.employeeId, employeeId)).limit(1);
  const currentPoints = balance?.currentBalance ?? 0;
  const pointsOk = currentPoints >= ELITE_THRESHOLDS.minPoints;

  // 2. KPI average (last 6 months) — pull from performance_records or perf_calibration
  let kpiAvg6m = 0;
  let kpiMonthsAbove83 = 0;
  try {
    const kpiRows = await db.execute(sql.raw(`
      SELECT score FROM performance_records
      WHERE employee_id = ${employeeId}
      ORDER BY period DESC LIMIT 6
    `));
    const scores = (kpiRows as unknown as { rows: { score: number }[] }).rows?.map((r: { score: number }) => Number(r.score)) ?? [];
    if (scores.length > 0) {
      kpiAvg6m = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      kpiMonthsAbove83 = scores.filter((s: number) => s >= ELITE_THRESHOLDS.minKpiAvg6m).length;
    }
  } catch {
    // performance_records may not exist yet
  }
  const kpiOk = kpiMonthsAbove83 >= 6;

  // 3. Skill level
  let skillLevel: string | null = null;
  try {
    const result = await db.execute(sql.raw(`
      SELECT skill_level FROM employees WHERE id = ${employeeId} LIMIT 1
    `));
    const empResult = result as { rows?: { skill_level?: string }[] };
    const emp = empResult.rows?.[0];
    skillLevel = emp?.skill_level ?? null;
  } catch { /* ignore */ }
  const skillOk = isSkillLevelEligible(skillLevel);

  // 4. High-delivery count (consecutive high-quality deliveries from project ratings)
  let highDeliveryCount = 0;
  try {
    const deliveryRows = await db.execute(sql.raw(`
      SELECT quality_score FROM project_quality_ratings
      WHERE employee_id = ${employeeId}
      ORDER BY rated_at DESC LIMIT 10
    `));
    const ratings = (deliveryRows as unknown as { rows: { quality_score: number }[] }).rows?.map((r: { quality_score: number }) => Number(r.quality_score)) ?? [];
    // Count consecutive from most recent
    for (const score of ratings) {
      if (score >= 85) highDeliveryCount++;
      else break;
    }
  } catch { /* table may not exist */ }

  // 5. Check current active benefits
  const activeBenefits = await db.select().from(eliteBenefitApplications)
    .where(and(
      eq(eliteBenefitApplications.employeeId, employeeId),
      sql`${eliteBenefitApplications.status} = 'active'`,
    )).limit(5);

  const hasAlternatingRest = activeBenefits.some(b => b.benefitType === "alternating_rest");
  const hasFiveDayWeek = activeBenefits.some(b => b.benefitType === "five_day_week");

  // 6. Cooldown check — 每次撤销后评选周期+1个月冷却
  const today = new Date().toISOString().slice(0, 10);
  let cooldownActive = false;
  let cooldownUntil: string | null = null;
  let totalRevocations = 0;
  try {
    const revokedHistory = await db.select().from(eliteBenefitApplications)
      .where(and(
        eq(eliteBenefitApplications.employeeId, employeeId),
        sql`${eliteBenefitApplications.status} = 'revoked'`,
      )).limit(50);
    totalRevocations = revokedHistory.length;
    // Find most recent cooldown_until
    for (const r of revokedHistory) {
      if (r.cooldownUntil && r.cooldownUntil > today) {
        cooldownActive = true;
        if (!cooldownUntil || r.cooldownUntil > cooldownUntil) {
          cooldownUntil = r.cooldownUntil;
        }
      }
    }
  } catch { /* ignore */ }

  const cooldownOk = !cooldownActive;
  const baseEligible = pointsOk && kpiOk && skillOk && cooldownOk;

  return {
    employeeId,
    currentPoints,
    kpiAvg6m: Math.round(kpiAvg6m * 100) / 100,
    kpiMonthsAbove83,
    skillLevel,
    highDeliveryCount,
    totalRevocations,
    cooldownUntil,
    eligibility: {
      alternatingRest: {
        eligible: baseEligible && !hasAlternatingRest,
        alreadyActive: hasAlternatingRest,
        checks: {
          points: { required: ELITE_THRESHOLDS.minPoints, actual: currentPoints, pass: pointsOk },
          kpi6m: { required: `≥${ELITE_THRESHOLDS.minKpiAvg6m} for 6 months`, actual: `${kpiAvg6m.toFixed(1)} avg, ${kpiMonthsAbove83}/6 months`, pass: kpiOk },
          skillLevel: { required: `≥${ELITE_THRESHOLDS.minSkillLevel}`, actual: skillLevel ?? "N/A", pass: skillOk },
          cooldown: { required: "无冷却期限制", actual: cooldownUntil ?? "无", pass: cooldownOk },
        },
      },
      fiveDayWeek: {
        eligible: hasAlternatingRest && highDeliveryCount >= ELITE_THRESHOLDS.minHighDeliveryCount && !hasFiveDayWeek,
        alreadyActive: hasFiveDayWeek,
        checks: {
          alternatingRestActive: { required: "大小休已生效", pass: hasAlternatingRest },
          highDelivery: { required: `≥${ELITE_THRESHOLDS.minHighDeliveryCount} consecutive`, actual: highDeliveryCount, pass: highDeliveryCount >= ELITE_THRESHOLDS.minHighDeliveryCount },
        },
      },
    },
  };
}

/** Apply for an elite benefit */
export async function applyEliteBenefit(input: {
  employeeId: number;
  benefitType: "alternating_rest" | "five_day_week";
}) {
  const db = await requireDb();
  const eligibility = await checkEliteEligibility(input.employeeId);

  const target = input.benefitType === "alternating_rest"
    ? eligibility.eligibility.alternatingRest
    : eligibility.eligibility.fiveDayWeek;

  if (!target.eligible) {
    return {
      success: false,
      reason: target.alreadyActive ? "该福利已在生效中" : "不满足申请条件",
      eligibility,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const endDate = input.benefitType === "alternating_rest"
    ? (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + ELITE_THRESHOLDS.alternatingRestDurationMonths);
      return d.toISOString().slice(0, 10);
    })()
    : null; // five_day_week is ongoing

  const [application] = await db.insert(eliteBenefitApplications).values({
    employeeId: input.employeeId,
    benefitType: input.benefitType,
    pointBalance: eligibility.currentPoints,
    kpiAvg6m: String(eligibility.kpiAvg6m),
    skillLevel: eligibility.skillLevel,
    highDeliveryCount: eligibility.highDeliveryCount,
    eligibilityDetails: eligibility as Record<string, unknown>,
    startDate: today,
    endDate,
    durationMonths: input.benefitType === "alternating_rest" ? ELITE_THRESHOLDS.alternatingRestDurationMonths : null,
  }).returning();

  log.info({
    applicationId: application.id,
    employeeId: input.employeeId,
    benefitType: input.benefitType,
    pointBalance: eligibility.currentPoints,
    kpiAvg6m: eligibility.kpiAvg6m,
  }, "Elite benefit application submitted");

  return { success: true, applicationId: application.id, eligibility };
}

/** Approve an elite benefit application */
export async function approveEliteBenefit(input: {
  applicationId: number;
  approverId: number;
  notes?: string;
}) {
  const db = await requireDb();
  const [updated] = await db.update(eliteBenefitApplications)
    .set({
      status: "active",
      approvedBy: input.approverId,
      approvalNotes: input.notes,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(
      eq(eliteBenefitApplications.id, input.applicationId),
      sql`${eliteBenefitApplications.status} = 'pending'`,
    ))
    .returning();

  if (!updated) return { success: false, reason: "申请不存在或已处理" };

  // Post to community
  const empInfo = await getEmployeeInfo(db, updated.employeeId);
  const benefitLabel = updated.benefitType === "alternating_rest" ? "大小休3个月" : "五天工作制";
  try {
    await postToCommunity({
      postType: "notice",
      title: `【精英福利】${empInfo.name} 获批${benefitLabel}`,
      content: `恭喜 ${empInfo.department} ${empInfo.name} 同事凭借持续优秀表现（积分${updated.pointBalance}分，KPI均分${updated.kpiAvg6m}），成功获批${benefitLabel}。积分稳步增长、持续高水准交付即可解锁精英福利！`,
      scope: "company_wide",
      priority: "normal",
      sourceType: "elite_benefit",
      sourceId: `benefit_${updated.id}`,
    });
  } catch (e) {
    log.warn({ error: e }, "Failed to post elite benefit to community (non-fatal)");
  }

  log.info({ applicationId: input.applicationId, benefitType: updated.benefitType }, "Elite benefit approved");
  return { success: true, application: updated };
}

/** Reject an elite benefit application */
export async function rejectEliteBenefit(input: {
  applicationId: number;
  approverId: number;
  reason?: string;
}) {
  const db = await requireDb();
  const [updated] = await db.update(eliteBenefitApplications)
    .set({
      status: "rejected",
      approvedBy: input.approverId,
      rejectedReason: input.reason,
      updatedAt: new Date(),
    })
    .where(and(
      eq(eliteBenefitApplications.id, input.applicationId),
      sql`${eliteBenefitApplications.status} = 'pending'`,
    ))
    .returning();

  if (!updated) return { success: false, reason: "申请不存在或已处理" };
  return { success: true };
}

/** List elite benefit applications */
export async function listEliteBenefitApplications(filters?: {
  employeeId?: number;
  status?: string;
  limit?: number;
}) {
  const db = await requireDb();
  const conditions: (SQL | undefined)[] = [];
  if (filters?.employeeId) conditions.push(eq(eliteBenefitApplications.employeeId, filters.employeeId));
  if (filters?.status) conditions.push(sql`${eliteBenefitApplications.status} = ${filters.status}`);

  return db.select().from(eliteBenefitApplications)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(eliteBenefitApplications.createdAt))
    .limit(filters?.limit ?? 50);
}

/** Revoke expired or no-longer-eligible elite benefits (scheduled job) */
/**
 * Monthly Elite Benefit Review — CEO动态考评循环
 *
 * Runs once per month. For each active benefit holder:
 * 1. Snapshot current KPI, points, skill
 * 2. If KPI < 80: increment consecutive violation counter
 *    - 1st month: issue WARNING, offer commitment option
 *    - 2nd consecutive month: check if commitment was met
 *      - If no commitment or commitment not met → REVOKE + cooldown
 * 3. If points < 5000 or skill downgraded → immediate REVOKE
 * 4. On revocation: cooldown = (totalRevocations + 1) months
 */
export async function runMonthlyEliteReview(period: string) {
  const db = await requireDb();
  const today = new Date().toISOString().slice(0, 10);

  // 1. Expire alternating_rest that passed endDate
  const expired = await db.update(eliteBenefitApplications)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(
      sql`${eliteBenefitApplications.status} = 'active'`,
      eq(eliteBenefitApplications.benefitType, "alternating_rest"),
      sql`end_date <= ${today}`,
    ))
    .returning();

  // 2. Get all active benefit holders
  const activeHolders = await db.select().from(eliteBenefitApplications)
    .where(sql`${eliteBenefitApplications.status} = 'active'`)
    .limit(500);

  let reviewed = 0, warned = 0, revoked = 0, passed = 0;

  for (const holder of activeHolders) {
    reviewed++;

    // Get current month KPI
    let kpiScore = 0;
    try {
      const kpiRows = await db.execute(sql.raw(`
        SELECT score FROM performance_records
        WHERE employee_id = ${holder.employeeId} AND period = '${period}'
        LIMIT 1
      `));
      kpiScore = Number((kpiRows as unknown as { rows: { score: number }[] }).rows?.[0]?.score) || 0;
    } catch { /* ignore */ }

    // Get current point balance
    const [bal] = await db.select().from(pointBalances)
      .where(eq(pointBalances.employeeId, holder.employeeId)).limit(1);
    const currentPoints = bal?.currentBalance ?? 0;

    // Get current skill level
    let skillLevel: string | null = null;
    try {
      const result = await db.execute(sql.raw(
        `SELECT skill_level FROM employees WHERE id = ${holder.employeeId} LIMIT 1`
      ));
      const empResult = result as { rows?: { skill_level?: string }[] };
      const emp = empResult.rows?.[0];
      skillLevel = emp?.skill_level ?? null;
    } catch { /* ignore */ }

    // Get previous review for consecutive tracking
    const [prevReview] = await db.select().from(eliteBenefitReviews)
      .where(and(
        eq(eliteBenefitReviews.applicationId, holder.id),
      ))
      .orderBy(desc(eliteBenefitReviews.createdAt))
      .limit(1);

    const prevConsecutiveKpi = prevReview?.consecutiveKpiViolations ?? 0;
    const prevConsecutivePoints = prevReview?.consecutivePointViolations ?? 0;

    // Check violations
    const kpiBelowThreshold = kpiScore > 0 && kpiScore < ELITE_THRESHOLDS.kpiDowngradeThreshold;
    const pointsBelowThreshold = currentPoints < ELITE_THRESHOLDS.minPoints;
    const skillDowngraded = !isSkillLevelEligible(skillLevel);

    const consecutiveKpi = kpiBelowThreshold ? prevConsecutiveKpi + 1 : 0;
    const consecutivePoints = pointsBelowThreshold ? prevConsecutivePoints + 1 : 0;

    // Determine outcome
    let outcome: "pass" | "warning" | "commitment" | "revoked" = "pass";
    let revocationReason: string | null = null;

    // Immediate revoke: points or skill
    if (pointsBelowThreshold) {
      outcome = "revoked";
      revocationReason = `积分降至${currentPoints}，低于${ELITE_THRESHOLDS.minPoints}门槛`;
    } else if (skillDowngraded) {
      outcome = "revoked";
      revocationReason = `技能等级降至${skillLevel ?? 'N/A'}，低于${ELITE_THRESHOLDS.minSkillLevel}要求`;
    }
    // KPI violation escalation
    else if (kpiBelowThreshold) {
      if (consecutiveKpi >= ELITE_THRESHOLDS.consecutiveKpiViolationLimit) {
        // Check if had a commitment that wasn't met
        if (prevReview?.outcome === "commitment" || prevReview?.outcome === "warning") {
          outcome = "revoked";
          revocationReason = `KPI连续${consecutiveKpi}个月低于${ELITE_THRESHOLDS.kpiDowngradeThreshold}分（本月${kpiScore}分），承诺改善期内未达标`;
        } else {
          outcome = "revoked";
          revocationReason = `KPI连续${consecutiveKpi}个月低于${ELITE_THRESHOLDS.kpiDowngradeThreshold}分`;
        }
      } else if (consecutiveKpi === 1) {
        // First violation: warning + offer commitment
        outcome = "warning";
      }
    }

    // Compute commitment deadline (for warnings)
    const commitmentDeadline = outcome === "warning"
      ? (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + ELITE_THRESHOLDS.commitmentWindowMonths);
        return d.toISOString().slice(0, 10);
      })()
      : null;

    // Insert review record
    await db.insert(eliteBenefitReviews).values({
      applicationId: holder.id,
      employeeId: holder.employeeId,
      reviewPeriod: period,
      benefitType: holder.benefitType,
      kpiScore: String(kpiScore),
      pointBalance: currentPoints,
      skillLevel,
      kpiBelowThreshold,
      pointsBelowThreshold,
      skillDowngraded,
      consecutiveKpiViolations: consecutiveKpi,
      consecutivePointViolations: consecutivePoints,
      outcome,
      commitmentDeadline,
      notes: revocationReason,
    }).returning();

    // Execute revocation
    if (outcome === "revoked") {
      const prevRevocations = holder.revocationCount ?? 0;
      const newCooldownMonths = (prevRevocations + 1) * ELITE_THRESHOLDS.baseCooldownMonths;
      const cooldownDate = new Date();
      cooldownDate.setMonth(cooldownDate.getMonth() + newCooldownMonths);

      await db.update(eliteBenefitApplications)
        .set({
          status: "revoked",
          revokedAt: new Date(),
          revocationReason,
          revocationCount: prevRevocations + 1,
          cooldownUntil: cooldownDate.toISOString().slice(0, 10),
          updatedAt: new Date(),
        })
        .where(eq(eliteBenefitApplications.id, holder.id));

      // Notify via community
      const empInfo = await getEmployeeInfo(db, holder.employeeId);
      try {
        await postToCommunity({
          postType: "notice",
          title: `【精英福利变更】${empInfo.name} 工作制度调整`,
          content: `${empInfo.department} ${empInfo.name} 同事因${revocationReason}，精英福利已调整，恢复标准六天工作制。下次申请冷却期：${newCooldownMonths}个月（至${cooldownDate.toISOString().slice(0, 10)}）。`,
          scope: "manager_chain",
          priority: "normal",
          sourceType: "elite_benefit_revocation",
          sourceId: `revoke_${holder.id}`,
        });
      } catch (e) {
        log.warn({ error: e }, "Failed to post revocation notice (non-fatal)");
      }

      revoked++;
    } else if (outcome === "warning") {
      warned++;
    } else {
      passed++;
    }
  }

  log.info({ period, expired: expired.length, reviewed, passed, warned, revoked }, "Monthly elite benefit review completed");
  return { period, expired: expired.length, reviewed, passed, warned, revoked };
}

/** Submit employee commitment to maintain benefit (承诺加强改善) */
export async function submitEliteCommitment(input: {
  employeeId: number;
  commitmentContent: string;
}) {
  const db = await requireDb();

  // Find the most recent warning review for this employee
  const [latestWarning] = await db.select().from(eliteBenefitReviews)
    .where(and(
      eq(eliteBenefitReviews.employeeId, input.employeeId),
      eq(eliteBenefitReviews.outcome, "warning"),
    ))
    .orderBy(desc(eliteBenefitReviews.createdAt))
    .limit(1);

  if (!latestWarning) {
    return { success: false, reason: "无待处理的警告记录" };
  }

  await db.update(eliteBenefitReviews)
    .set({
      outcome: "commitment",
      commitmentContent: input.commitmentContent,
      commitmentResult: "pending",
    })
    .where(eq(eliteBenefitReviews.id, latestWarning.id));

  log.info({
    employeeId: input.employeeId,
    reviewId: latestWarning.id,
    deadline: latestWarning.commitmentDeadline,
  }, "Employee commitment submitted for elite benefit retention");

  return {
    success: true,
    message: `承诺已提交，改善窗口截止日: ${latestWarning.commitmentDeadline}。请在此期间内将KPI提升至${ELITE_THRESHOLDS.kpiDowngradeThreshold}分以上。`,
    deadline: latestWarning.commitmentDeadline,
  };
}

/** Get elite benefit review history for an employee */
export async function getEliteReviewHistory(employeeId: number) {
  const db = await requireDb();
  return db.select().from(eliteBenefitReviews)
    .where(eq(eliteBenefitReviews.employeeId, employeeId))
    .orderBy(desc(eliteBenefitReviews.createdAt))
    .limit(24);
}

/** Legacy alias — runs monthly review */
export async function revokeExpiredEliteBenefits() {
  const period = new Date().toISOString().slice(0, 7);
  return runMonthlyEliteReview(period);
}
