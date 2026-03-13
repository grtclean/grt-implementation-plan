/**
 * Authorization Hierarchy Service (授权层级审批制度)
 *
 * Core business logic for:
 * - Multi-level approval chain resolution
 * - Employee credit tier management
 * - Green channel eligibility + usage
 * - Post-facto submission handling
 * - Integrity incentive calculation
 * - Audit trail recording
 */

import { eq, and, desc, sql, gte, lte, asc } from "drizzle-orm";
import { db } from "../db";
import {
  authorizationPolicies,
  employeeCreditTiers,
  greenChannelRules,
  greenChannelUsages,
  postFactoSubmissions,
  integrityIncentiveRecords,
  authorizationAuditTrail,
  type ThresholdRule,
} from "../../drizzle/authorization-hierarchy-schema";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("authorization-hierarchy");

/* ── Types ────────────────────────────────────────────────── */

export interface ApprovalStep {
  level: number;
  levelLabel: string;
  approverRole: string;
  autoApprove: boolean;
  isRequired: boolean;
}

export interface ApprovalChainResult {
  steps: ApprovalStep[];
  matchedPolicy: string;
  isGreenChannel: boolean;
  greenChannelAutoApproved: boolean;
  postFactoRequired: boolean;
  postFactoDeadlineDays: number;
}

export interface GreenChannelEligibility {
  eligible: boolean;
  reason?: string;
  maxAmount: number;
  autoApproveThreshold: number;
  cooldownRemaining: number;
  monthlyUsesRemaining: number;
  ruleId?: number;
}

/* ── Policy Management ────────────────────────────────────── */

export async function listPolicies(domain?: string) {
  const conditions = [];
  if (domain) conditions.push(eq(authorizationPolicies.domain, domain as any));
  conditions.push(eq(authorizationPolicies.isActive, true));

  const rows = await db
    .select()
    .from(authorizationPolicies)
    .where(and(...conditions))
    .orderBy(asc(authorizationPolicies.domain))
    .limit(100);
  return rows;
}

export async function getPolicyById(id: number) {
  const [row] = await db
    .select()
    .from(authorizationPolicies)
    .where(eq(authorizationPolicies.id, id))
    .limit(1);
  return row ?? null;
}

export async function upsertPolicy(data: {
  id?: number;
  policyCode: string;
  domain: string;
  policyName: string;
  description?: string;
  thresholdRules: ThresholdRule[];
  durationRules?: any[];
  buScope?: string;
  createdBy?: string;
}) {
  if (data.id) {
    const [updated] = await db
      .update(authorizationPolicies)
      .set({
        policyName: data.policyName,
        description: data.description,
        thresholdRules: data.thresholdRules,
        durationRules: data.durationRules,
        buScope: data.buScope,
        version: sql`${authorizationPolicies.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(authorizationPolicies.id, data.id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(authorizationPolicies)
    .values({
      policyCode: data.policyCode,
      domain: data.domain as any,
      policyName: data.policyName,
      description: data.description,
      thresholdRules: data.thresholdRules,
      durationRules: data.durationRules,
      buScope: data.buScope,
      createdBy: data.createdBy,
    })
    .returning();
  return inserted;
}

/* ── Approval Chain Resolution ────────────────────────────── */

export async function resolveApprovalChain(
  domain: string,
  amount: number,
  userId: number,
  buCode?: string,
): Promise<ApprovalChainResult> {
  // 1. Find applicable policy
  const policies = await db
    .select()
    .from(authorizationPolicies)
    .where(
      and(
        eq(authorizationPolicies.domain, domain as any),
        eq(authorizationPolicies.isActive, true),
      ),
    )
    .limit(10);

  // Prefer BU-scoped policy, fall back to global
  const policy =
    policies.find((p) => p.buScope === buCode) ??
    policies.find((p) => !p.buScope) ??
    policies[0];

  if (!policy) {
    return {
      steps: [{ level: 5, levelLabel: "董事长", approverRole: "admin", autoApprove: false, isRequired: true }],
      matchedPolicy: "FALLBACK_CEO",
      isGreenChannel: false,
      greenChannelAutoApproved: false,
      postFactoRequired: false,
      postFactoDeadlineDays: 0,
    };
  }

  // 2. Determine required approval levels based on amount
  const rules = (policy.thresholdRules as ThresholdRule[]) || [];
  const steps: ApprovalStep[] = [];

  for (const rule of rules) {
    const maxAmt = rule.maxAmount === -1 ? Infinity : rule.maxAmount;
    if (amount >= rule.minAmount && amount < maxAmt) {
      // This is the target level — include all levels up to and including it
      for (const r of rules) {
        if (r.level <= rule.level) {
          steps.push({
            level: r.level,
            levelLabel: r.levelLabel,
            approverRole: r.approverRole,
            autoApprove: r.autoApprove,
            isRequired: r.isRequired,
          });
        }
      }
      break;
    }
  }

  // If no match (amount exceeds all thresholds), require CEO
  if (steps.length === 0) {
    for (const r of rules) {
      steps.push({
        level: r.level,
        levelLabel: r.levelLabel,
        approverRole: r.approverRole,
        autoApprove: false,
        isRequired: true,
      });
    }
  }

  // 3. Check green channel eligibility
  const gcResult = await checkGreenChannelEligibility(userId, domain, amount);

  return {
    steps,
    matchedPolicy: policy.policyCode,
    isGreenChannel: gcResult.eligible,
    greenChannelAutoApproved: gcResult.eligible && amount <= gcResult.autoApproveThreshold,
    postFactoRequired: gcResult.eligible,
    postFactoDeadlineDays: gcResult.eligible ? 3 : 0,
  };
}

/* ── Credit Tier Management ───────────────────────────────── */

export async function getCreditTier(userId: number) {
  const [row] = await db
    .select()
    .from(employeeCreditTiers)
    .where(eq(employeeCreditTiers.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function listCreditTiers(opts?: { tier?: string; limit?: number; offset?: number }) {
  const conditions = [];
  if (opts?.tier) conditions.push(eq(employeeCreditTiers.creditTier, opts.tier as any));

  const rows = await db
    .select()
    .from(employeeCreditTiers)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(employeeCreditTiers.creditScore))
    .limit(Math.min(opts?.limit ?? 100, 500))
    .offset(opts?.offset ?? 0);
  return rows;
}

export async function recalculateCreditScore(userId: number) {
  const tier = await getCreditTier(userId);
  if (!tier) return null;

  // Weighted components: compliance 40%, financial 30%, delivery 20%, trust 10%
  const compliance = Number(tier.approvalComplianceScore ?? 80);
  const financial = Number(tier.financialIntegrityScore ?? 80);
  const delivery = Number(tier.taskDeliveryScore ?? 80);
  const trust = Number(tier.peerTrustScore ?? 80);

  const score = compliance * 0.4 + financial * 0.3 + delivery * 0.2 + trust * 0.1;

  // Determine tier
  let newTier: string;
  if (score >= 95) newTier = "platinum";
  else if (score >= 85) newTier = "gold";
  else if (score >= 70) newTier = "silver";
  else if (score >= 50) newTier = "bronze";
  else newTier = "restricted";

  // Green channel eligibility
  const gcEligible = newTier === "platinum" || newTier === "gold";
  const gcMaxAmount =
    newTier === "platinum" ? 50000 : newTier === "gold" ? 20000 : newTier === "silver" ? 5000 : 0;

  const [updated] = await db
    .update(employeeCreditTiers)
    .set({
      creditScore: String(score.toFixed(2)),
      creditTier: newTier as any,
      greenChannelEligible: gcEligible,
      greenChannelMaxAmount: String(gcMaxAmount),
      tierCalculatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(employeeCreditTiers.userId, userId))
    .returning();
  return updated;
}

export async function overrideCreditTier(
  userId: number,
  creditTier: string,
  creditScore: number,
  reviewerId: number,
) {
  const [updated] = await db
    .update(employeeCreditTiers)
    .set({
      creditScore: String(creditScore.toFixed(2)),
      creditTier: creditTier as any,
      greenChannelEligible: creditTier === "platinum" || creditTier === "gold",
      lastReviewedBy: reviewerId,
      lastReviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(employeeCreditTiers.userId, userId))
    .returning();
  return updated;
}

/* ── Green Channel ────────────────────────────────────────── */

export async function checkGreenChannelEligibility(
  userId: number,
  domain: string,
  amount: number,
): Promise<GreenChannelEligibility> {
  const tier = await getCreditTier(userId);
  if (!tier || !tier.greenChannelEligible) {
    return {
      eligible: false,
      reason: "信用等级不符合绿色通道要求",
      maxAmount: 0,
      autoApproveThreshold: 0,
      cooldownRemaining: 0,
      monthlyUsesRemaining: 0,
    };
  }

  // Find applicable GC rule
  const rules = await db
    .select()
    .from(greenChannelRules)
    .where(
      and(
        eq(greenChannelRules.domain, domain as any),
        eq(greenChannelRules.creditTierRequired, tier.creditTier),
        eq(greenChannelRules.isActive, true),
      ),
    )
    .limit(1);

  const rule = rules[0];
  if (!rule) {
    return {
      eligible: false,
      reason: `该领域(${domain})无绿色通道规则`,
      maxAmount: 0,
      autoApproveThreshold: 0,
      cooldownRemaining: 0,
      monthlyUsesRemaining: 0,
    };
  }

  // Check amount
  if (amount > Number(rule.maxAmountAllowed)) {
    return {
      eligible: false,
      reason: `金额 ¥${amount.toLocaleString()} 超出绿色通道上限 ¥${Number(rule.maxAmountAllowed).toLocaleString()}`,
      maxAmount: Number(rule.maxAmountAllowed),
      autoApproveThreshold: Number(rule.autoApproveThreshold),
      cooldownRemaining: 0,
      monthlyUsesRemaining: 0,
    };
  }

  // Check cooldown
  let cooldownRemaining = 0;
  if (tier.lastGreenChannelUsedAt) {
    const daysSinceLast = Math.floor(
      (Date.now() - new Date(tier.lastGreenChannelUsedAt).getTime()) / 86400000,
    );
    cooldownRemaining = Math.max(0, rule.cooldownDays - daysSinceLast);
    if (cooldownRemaining > 0) {
      return {
        eligible: false,
        reason: `绿色通道冷却期未满，还需等待 ${cooldownRemaining} 天`,
        maxAmount: Number(rule.maxAmountAllowed),
        autoApproveThreshold: Number(rule.autoApproveThreshold),
        cooldownRemaining,
        monthlyUsesRemaining: 0,
      };
    }
  }

  // Check monthly usage limit
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const usages = await db
    .select({ count: sql<number>`count(*)` })
    .from(greenChannelUsages)
    .where(
      and(
        eq(greenChannelUsages.userId, userId),
        eq(greenChannelUsages.domain, domain as any),
        gte(greenChannelUsages.createdAt, monthStart),
      ),
    );

  const monthlyUsed = Number(usages[0]?.count ?? 0);
  const monthlyRemaining = rule.monthlyUsageLimit - monthlyUsed;

  if (monthlyRemaining <= 0) {
    return {
      eligible: false,
      reason: `本月绿色通道使用次数已达上限 (${rule.monthlyUsageLimit}次)`,
      maxAmount: Number(rule.maxAmountAllowed),
      autoApproveThreshold: Number(rule.autoApproveThreshold),
      cooldownRemaining: 0,
      monthlyUsesRemaining: 0,
    };
  }

  return {
    eligible: true,
    maxAmount: Number(rule.maxAmountAllowed),
    autoApproveThreshold: Number(rule.autoApproveThreshold),
    cooldownRemaining: 0,
    monthlyUsesRemaining: monthlyRemaining,
    ruleId: rule.id,
  };
}

export async function useGreenChannel(data: {
  userId: number;
  employeeName: string;
  domain: string;
  amount: number;
  description?: string;
  approvalInstanceId?: number;
}) {
  const tier = await getCreditTier(data.userId);
  if (!tier) throw new Error("信用记录不存在");

  const eligibility = await checkGreenChannelEligibility(data.userId, data.domain, data.amount);
  if (!eligibility.eligible) throw new Error(eligibility.reason);

  // Calculate post-facto deadline (3 business days)
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 3);

  const [usage] = await db
    .insert(greenChannelUsages)
    .values({
      userId: data.userId,
      employeeName: data.employeeName,
      domain: data.domain as any,
      amount: String(data.amount),
      description: data.description,
      approvalInstanceId: data.approvalInstanceId,
      creditTierAtUsage: tier.creditTier,
      ruleId: eligibility.ruleId,
      postFactoRequired: true,
      postFactoDeadline: deadline,
      postFactoStatus: "pending_doc",
    })
    .returning();

  // Update last usage timestamp
  await db
    .update(employeeCreditTiers)
    .set({ lastGreenChannelUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(employeeCreditTiers.userId, data.userId));

  // Record audit
  await recordAudit({
    eventType: "green_channel",
    domain: data.domain,
    actorId: data.userId,
    actorName: data.employeeName,
    amount: data.amount,
    decision: "approved_gc",
    creditTierAtTime: tier.creditTier,
    isGreenChannel: true,
    metadata: { ruleId: eligibility.ruleId, autoApproveThreshold: eligibility.autoApproveThreshold },
  });

  log.info({ userId: data.userId, domain: data.domain, amount: data.amount }, "Green channel used");
  return usage;
}

export async function listGreenChannelUsages(userId?: number, limit = 50) {
  const conditions = [];
  if (userId) conditions.push(eq(greenChannelUsages.userId, userId));

  return db
    .select()
    .from(greenChannelUsages)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(greenChannelUsages.createdAt))
    .limit(Math.min(limit, 200));
}

export async function listGreenChannelRules(domain?: string) {
  const conditions = [eq(greenChannelRules.isActive, true)];
  if (domain) conditions.push(eq(greenChannelRules.domain, domain as any));

  return db
    .select()
    .from(greenChannelRules)
    .where(and(...conditions))
    .orderBy(asc(greenChannelRules.domain))
    .limit(100);
}

export async function updateGreenChannelRule(id: number, data: Partial<{
  maxAmountAllowed: number;
  autoApproveThreshold: number;
  cooldownDays: number;
  monthlyUsageLimit: number;
  postFactoDeadlineDays: number;
  isActive: boolean;
}>) {
  const values: Record<string, any> = { updatedAt: new Date() };
  if (data.maxAmountAllowed !== undefined) values.maxAmountAllowed = String(data.maxAmountAllowed);
  if (data.autoApproveThreshold !== undefined) values.autoApproveThreshold = String(data.autoApproveThreshold);
  if (data.cooldownDays !== undefined) values.cooldownDays = data.cooldownDays;
  if (data.monthlyUsageLimit !== undefined) values.monthlyUsageLimit = data.monthlyUsageLimit;
  if (data.postFactoDeadlineDays !== undefined) values.postFactoDeadlineDays = data.postFactoDeadlineDays;
  if (data.isActive !== undefined) values.isActive = data.isActive;

  const [updated] = await db
    .update(greenChannelRules)
    .set(values)
    .where(eq(greenChannelRules.id, id))
    .returning();
  return updated;
}

/* ── Post-Facto Submissions ───────────────────────────────── */

export async function submitPostFacto(data: {
  userId: number;
  employeeName: string;
  domain: string;
  greenChannelUsageId?: number;
  originalApprovalId?: number;
  actionDate: Date;
  reason: string;
  urgencyJustification?: string;
  supportingDocuments?: any[];
}) {
  const deadline = new Date(data.actionDate);
  deadline.setDate(deadline.getDate() + 3);

  const [submission] = await db
    .insert(postFactoSubmissions)
    .values({
      userId: data.userId,
      employeeName: data.employeeName,
      domain: data.domain as any,
      greenChannelUsageId: data.greenChannelUsageId,
      originalApprovalId: data.originalApprovalId,
      actionDate: data.actionDate,
      submissionDate: new Date(),
      deadlineDate: deadline,
      isOverdue: new Date() > deadline,
      reason: data.reason,
      urgencyJustification: data.urgencyJustification,
      supportingDocuments: data.supportingDocuments,
      status: "pending_review",
    })
    .returning();

  // Update green channel usage if linked
  if (data.greenChannelUsageId) {
    await db
      .update(greenChannelUsages)
      .set({
        postFactoSubmittedAt: new Date(),
        postFactoStatus: "pending_review",
      })
      .where(eq(greenChannelUsages.id, data.greenChannelUsageId));
  }

  // Update credit tier counters
  await db
    .update(employeeCreditTiers)
    .set({
      postFactoCount: sql`${employeeCreditTiers.postFactoCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(employeeCreditTiers.userId, data.userId));

  log.info({ userId: data.userId, domain: data.domain }, "Post-facto submission created");
  return submission;
}

export async function reviewPostFacto(
  id: number,
  reviewerId: number,
  reviewerName: string,
  status: "approved" | "rejected",
  comment?: string,
) {
  const [existing] = await db
    .select()
    .from(postFactoSubmissions)
    .where(eq(postFactoSubmissions.id, id))
    .limit(1);

  if (!existing) throw new Error("事后补交记录不存在");

  // Calculate credit score impact
  let creditImpact = 0;
  if (status === "approved") {
    if (existing.isOverdue) creditImpact = -3; // overdue but approved
    else creditImpact = 0; // on-time, no penalty
  } else {
    creditImpact = -5; // rejected
  }

  const [updated] = await db
    .update(postFactoSubmissions)
    .set({
      status: status as any,
      reviewerId,
      reviewerName,
      reviewComment: comment,
      reviewedAt: new Date(),
      creditScoreImpact: String(creditImpact),
      penaltyApplied: creditImpact < 0,
      penaltyDetails: creditImpact < 0 ? `信用积分扣减 ${creditImpact} (${status === "rejected" ? "审核驳回" : "逾期提交"})` : null,
      updatedAt: new Date(),
    })
    .where(eq(postFactoSubmissions.id, id))
    .returning();

  // Apply credit score impact
  if (creditImpact !== 0) {
    await db
      .update(employeeCreditTiers)
      .set({
        approvalComplianceScore: sql`GREATEST(0, LEAST(100, ${employeeCreditTiers.approvalComplianceScore} + ${creditImpact}))`,
        postFactoWithinPolicy: status === "approved"
          ? sql`${employeeCreditTiers.postFactoWithinPolicy} + 1`
          : employeeCreditTiers.postFactoWithinPolicy,
        updatedAt: new Date(),
      })
      .where(eq(employeeCreditTiers.userId, existing.userId));

    await recalculateCreditScore(existing.userId);
  }

  // Audit
  await recordAudit({
    eventType: "post_facto",
    domain: existing.domain,
    actorId: reviewerId,
    actorName: reviewerName,
    targetUserId: existing.userId,
    targetName: existing.employeeName,
    decision: status,
    isPostFacto: true,
    metadata: { creditImpact, isOverdue: existing.isOverdue },
  });

  return updated;
}

export async function getMyPendingPostFacto(userId: number) {
  return db
    .select()
    .from(postFactoSubmissions)
    .where(
      and(
        eq(postFactoSubmissions.userId, userId),
        sql`${postFactoSubmissions.status} IN ('pending_doc', 'pending_review')`,
      ),
    )
    .orderBy(asc(postFactoSubmissions.deadlineDate))
    .limit(50);
}

export async function listOverduePostFacto() {
  return db
    .select()
    .from(postFactoSubmissions)
    .where(
      and(
        sql`${postFactoSubmissions.status} IN ('pending_doc', 'pending_review')`,
        lte(postFactoSubmissions.deadlineDate, new Date()),
      ),
    )
    .orderBy(asc(postFactoSubmissions.deadlineDate))
    .limit(100);
}

/* ── Integrity Incentive ──────────────────────────────────── */

export async function getIntegrityScore(userId: number, period?: string) {
  const targetPeriod = period ?? new Date().toISOString().slice(0, 7);
  const [row] = await db
    .select()
    .from(integrityIncentiveRecords)
    .where(
      and(
        eq(integrityIncentiveRecords.userId, userId),
        eq(integrityIncentiveRecords.period, targetPeriod),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getIntegrityLeaderboard(period?: string, limit = 20) {
  const targetPeriod = period ?? new Date().toISOString().slice(0, 7);
  return db
    .select()
    .from(integrityIncentiveRecords)
    .where(eq(integrityIncentiveRecords.period, targetPeriod))
    .orderBy(desc(integrityIncentiveRecords.integrityScore))
    .limit(Math.min(limit, 100));
}

export async function recognizeEmployee(
  userId: number,
  employeeName: string,
  period: string,
  recognitionType: string,
  note: string,
  reviewerId: number,
) {
  // Upsert integrity record with recognition
  const existing = await getIntegrityScore(userId, period);
  if (existing) {
    const [updated] = await db
      .update(integrityIncentiveRecords)
      .set({
        isPubliclyRecognized: true,
        recognitionType,
        recognitionNote: note,
        bonusPoints: sql`${integrityIncentiveRecords.bonusPoints} + 50`,
        reviewedBy: reviewerId,
      })
      .where(eq(integrityIncentiveRecords.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(integrityIncentiveRecords)
    .values({
      userId,
      employeeName,
      period,
      integrityScore: "90.00",
      bonusPoints: 50,
      isPubliclyRecognized: true,
      recognitionType,
      recognitionNote: note,
      reviewedBy: reviewerId,
      generatedAt: new Date(),
    })
    .returning();
  return created;
}

/* ── Audit Trail ──────────────────────────────────────────── */

export async function recordAudit(data: {
  eventType: string;
  domain?: string;
  instanceId?: number;
  actorId: number;
  actorName?: string;
  actorRole?: string;
  targetUserId?: number;
  targetName?: string;
  amount?: number;
  decision?: string;
  policyApplied?: string;
  creditTierAtTime?: string;
  isGreenChannel?: boolean;
  isPostFacto?: boolean;
  metadata?: any;
  ipAddress?: string;
}) {
  return db.insert(authorizationAuditTrail).values({
    eventType: data.eventType as any,
    domain: (data.domain as any) ?? null,
    instanceId: data.instanceId,
    actorId: data.actorId,
    actorName: data.actorName,
    actorRole: data.actorRole,
    targetUserId: data.targetUserId,
    targetName: data.targetName,
    amount: data.amount != null ? String(data.amount) : null,
    decision: data.decision,
    policyApplied: data.policyApplied,
    creditTierAtTime: (data.creditTierAtTime as any) ?? null,
    isGreenChannel: data.isGreenChannel ?? false,
    isPostFacto: data.isPostFacto ?? false,
    metadata: data.metadata,
    ipAddress: data.ipAddress,
  });
}

export async function searchAudit(opts: {
  domain?: string;
  eventType?: string;
  actorId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const conditions = [];
  if (opts.domain) conditions.push(eq(authorizationAuditTrail.domain, opts.domain as any));
  if (opts.eventType) conditions.push(eq(authorizationAuditTrail.eventType, opts.eventType as any));
  if (opts.actorId) conditions.push(eq(authorizationAuditTrail.actorId, opts.actorId));
  if (opts.startDate) conditions.push(gte(authorizationAuditTrail.createdAt, opts.startDate));
  if (opts.endDate) conditions.push(lte(authorizationAuditTrail.createdAt, opts.endDate));

  return db
    .select()
    .from(authorizationAuditTrail)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(authorizationAuditTrail.createdAt))
    .limit(Math.min(opts.limit ?? 100, 500))
    .offset(opts.offset ?? 0);
}

/* ── Dashboard Stats ──────────────────────────────────────── */

export async function getDashboardStats() {
  const [tierStats] = await db
    .select({
      total: sql<number>`count(*)`,
      platinum: sql<number>`count(*) FILTER (WHERE credit_tier = 'platinum')`,
      gold: sql<number>`count(*) FILTER (WHERE credit_tier = 'gold')`,
      silver: sql<number>`count(*) FILTER (WHERE credit_tier = 'silver')`,
      bronze: sql<number>`count(*) FILTER (WHERE credit_tier = 'bronze')`,
      restricted: sql<number>`count(*) FILTER (WHERE credit_tier = 'restricted')`,
      avgScore: sql<number>`ROUND(AVG(credit_score::numeric), 2)`,
    })
    .from(employeeCreditTiers);

  const [gcStats] = await db
    .select({
      totalUsages: sql<number>`count(*)`,
      pendingDoc: sql<number>`count(*) FILTER (WHERE post_facto_status = 'pending_doc')`,
      overdue: sql<number>`count(*) FILTER (WHERE post_facto_status = 'overdue')`,
    })
    .from(greenChannelUsages);

  const [pfStats] = await db
    .select({
      total: sql<number>`count(*)`,
      pendingReview: sql<number>`count(*) FILTER (WHERE status = 'pending_review')`,
      approved: sql<number>`count(*) FILTER (WHERE status = 'approved')`,
      rejected: sql<number>`count(*) FILTER (WHERE status = 'rejected')`,
      overdue: sql<number>`count(*) FILTER (WHERE is_overdue = true)`,
    })
    .from(postFactoSubmissions);

  const policyCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(authorizationPolicies)
    .where(eq(authorizationPolicies.isActive, true));

  return {
    creditTiers: tierStats,
    greenChannel: gcStats,
    postFacto: pfStats,
    activePolicies: Number(policyCount[0]?.count ?? 0),
  };
}
