/**
 * Risk Scorer Service - Layer 2 of AI Early Warning System (Task #72)
 * Combines health scores with contextual factors to calculate risk.
 * Generates notifications based on risk level.
 */

import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("risk-scorer");

// ===== Type Definitions =====

type RiskLevel = "low" | "medium" | "high" | "critical";

interface RiskFactor {
  name: string;
  value: number;
  weight: number;
  description: string;
}

interface RiskResult {
  projectId: number;
  riskScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
}

interface NotificationRecord {
  id: number;
  projectId: number;
  recipientRole: string;
  recipientUserId: number | null;
  riskLevel: string;
  title: string;
  message: string;
  isRead: boolean | null;
  createdAt: Date | null;
  readAt: Date | null;
}

// ===== Helper Functions =====

async function requireDb() {
  const d = await getDb();
  if (!d) throw new Error("Database connection not available");
  return d;
}

function determineRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

// ===== Exported Service Functions =====

/** Calculate risk score for a project combining health score with contextual factors */
export async function calculateRiskScore(projectId: number): Promise<RiskResult> {
  const d = await requireDb();

  // Get latest health score
  const healthRows = await d
    .select()
    .from(schema.projectHealthScores)
    .where(eq(schema.projectHealthScores.projectId, projectId))
    .orderBy(desc(schema.projectHealthScores.scannedAt))
    .limit(1);

  const latestHealth = healthRows.length > 0 ? healthRows[0] : null;
  const healthScore = latestHealth ? latestHealth.healthScore : 100;
  const issueCount = latestHealth ? (latestHealth.issueCount || 0) : 0;
  const criticalCount = latestHealth ? (latestHealth.criticalCount || 0) : 0;

  // Get project details for contextual factors
  const projectRows = await d
    .select({
      id: schema.projectsV2.id,
      projectCode: schema.projectsV2.projectCode,
      customerId: schema.projectsV2.customerId,
      priority: schema.projectsV2.priority,
      budget: schema.projectsV2.budget,
      plannedEndDate: schema.projectsV2.plannedEndDate,
    })
    .from(schema.projectsV2)
    .where(eq(schema.projectsV2.id, projectId));

  if (projectRows.length === 0) {
    throw new Error("Project " + projectId + " not found");
  }

  const project = projectRows[0];
  const factors: RiskFactor[] = [];

  // Factor 1: Health score inversion (lower health = higher risk)
  const healthRiskValue = Math.max(0, 100 - healthScore);
  factors.push({
    name: "health_score",
    value: healthRiskValue,
    weight: 0.35,
    description: "Health score: " + healthScore + "/100 (inverted for risk)",
  });

  // Factor 2: Customer tier (P0/P1 = tier1 = higher impact multiplier 1.5x)
  const priorityStr = project.priority || "P2";
  const isTier1 = priorityStr === "P0" || priorityStr === "P1";
  const tierMultiplier = isTier1 ? 1.5 : 1.0;
  const tierValue = isTier1 ? 80 : 40;
  factors.push({
    name: "customer_tier",
    value: tierValue,
    weight: 0.15,
    description: "Priority: " + priorityStr + (isTier1 ? " (tier1, 1.5x multiplier)" : " (standard)"),
  });

  // Factor 3: Project value/size (budget-based)
  const budgetVal = project.budget ? parseFloat(project.budget) : 0;
  const budgetRisk = budgetVal > 1000000 ? 70 : budgetVal > 500000 ? 50 : budgetVal > 100000 ? 30 : 15;
  factors.push({
    name: "project_value",
    value: budgetRisk,
    weight: 0.15,
    description: "Budget: " + (budgetVal > 0 ? budgetVal.toLocaleString() : "not set"),
  });

  // Factor 4: Deadline proximity (closer = higher risk)
  let deadlineRisk = 20;
  if (project.plannedEndDate) {
    const endDate = new Date(project.plannedEndDate);
    const now = new Date();
    const daysLeft = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) {
      deadlineRisk = 100; // Past deadline
    } else if (daysLeft < 7) {
      deadlineRisk = 90;
    } else if (daysLeft < 30) {
      deadlineRisk = 60;
    } else if (daysLeft < 90) {
      deadlineRisk = 30;
    } else {
      deadlineRisk = 10;
    }
  }
  factors.push({
    name: "deadline_proximity",
    value: deadlineRisk,
    weight: 0.2,
    description: "Deadline: " + (project.plannedEndDate || "not set"),
  });

  // Factor 5: Number of open issues
  const issueRisk = Math.min(100, issueCount * 15 + criticalCount * 25);
  factors.push({
    name: "open_issues",
    value: issueRisk,
    weight: 0.15,
    description: issueCount + " issues (" + criticalCount + " critical)",
  });

  // Calculate weighted risk score with tier multiplier
  let rawRisk = 0;
  for (const factor of factors) {
    rawRisk += factor.value * factor.weight;
  }
  const riskScore = Math.min(100, Math.round(rawRisk * tierMultiplier));
  const riskLevel = determineRiskLevel(riskScore);

  return {
    projectId,
    riskScore,
    riskLevel,
    factors,
  };
}

/** Get risk dashboard - all projects sorted by risk score */
export async function getRiskDashboard(): Promise<RiskResult[]> {
  const d = await requireDb();

  const projects = await d
    .select({ id: schema.projectsV2.id })
    .from(schema.projectsV2)
    .where(eq(schema.projectsV2.status, "Active"));

  const results: RiskResult[] = [];
  for (const project of projects) {
    try {
      const result = await calculateRiskScore(project.id);
      results.push(result);
    } catch (err) {
      // Skip projects that fail risk calculation
      log.warn({ err, projectId: project.id }, "Failed to calculate risk for project");
    }
  }

  // Sort by risk score descending (highest risk first)
  results.sort((a, b) => b.riskScore - a.riskScore);
  return results;
}

/** Get notifications for a user */
export async function getNotifications(opts: {
  userId?: number;
  unreadOnly?: boolean;
}): Promise<NotificationRecord[]> {
  const d = await requireDb();

  let query = d.select().from(schema.riskNotifications);

  if (opts.userId && opts.unreadOnly) {
    query = query.where(
      and(
        eq(schema.riskNotifications.recipientUserId, opts.userId),
        eq(schema.riskNotifications.isRead, false)
      )
    ) as typeof query;
  } else if (opts.userId) {
    query = query.where(
      eq(schema.riskNotifications.recipientUserId, opts.userId)
    ) as typeof query;
  } else if (opts.unreadOnly) {
    query = query.where(
      eq(schema.riskNotifications.isRead, false)
    ) as typeof query;
  }

  const rows = await query
    .orderBy(desc(schema.riskNotifications.createdAt))
    .limit(100);

  return rows;
}

/** Mark a notification as read */
export async function markNotificationRead(id: number): Promise<{ success: boolean }> {
  const d = await requireDb();

  await d
    .update(schema.riskNotifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(schema.riskNotifications.id, id));

  return { success: true };
}

/** Generate notifications based on risk results */
export async function generateNotifications(
  riskResults: RiskResult[]
): Promise<number> {
  const d = await requireDb();
  let notificationCount = 0;

  for (const result of riskResults) {
    const roles: string[] = [];

    // Determine notification recipients based on risk level
    switch (result.riskLevel) {
      case "critical":
        roles.push("admin", "pm", "bu_head");
        break;
      case "high":
        roles.push("pm", "bu_manager");
        break;
      case "medium":
        roles.push("pm");
        break;
      case "low":
        // No notification for low risk
        continue;
    }

    const riskLabel = result.riskLevel.toUpperCase();
    const title = "[" + riskLabel + "] Project #" + result.projectId + " risk alert (score: " + result.riskScore + ")";
    const factorSummary = result.factors
      .map((f) => f.name + ": " + f.description)
      .join("; ");
    const message =
      "Risk level: " + result.riskLevel + ". Score: " + result.riskScore + "/100. Factors: " + factorSummary;

    for (const role of roles) {
      await d.insert(schema.riskNotifications).values({
        projectId: result.projectId,
        recipientRole: role,
        riskLevel: result.riskLevel,
        title,
        message,
      });
      notificationCount++;
    }
  }

  return notificationCount;
}
