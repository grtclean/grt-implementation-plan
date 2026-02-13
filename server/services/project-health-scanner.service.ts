/**
 * Project Health Scanner Service - Layer 1 of AI Early Warning System (Task #71)
 * Scans projects for health indicators: overdue stages, stuck stages,
 * missing outputs, budget overruns.
 */

import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// ===== Type Definitions =====

type HealthIssueSeverity = "critical" | "warning" | "info";

interface HealthIssue {
  type: string;
  severity: HealthIssueSeverity;
  message: string;
  stageCode: string | null;
  detectedAt: string;
}

interface ProjectHealthReport {
  projectId: number;
  projectCode: string;
  healthScore: number;
  issues: HealthIssue[];
}

interface HealthScoreRecord {
  id: number;
  projectId: number;
  healthScore: number;
  issueCount: number | null;
  criticalCount: number | null;
  warningCount: number | null;
  infoCount: number | null;
  issuesJson: string | null;
  scannedAt: Date | null;
}

// ===== Helper Functions =====

async function requireDb() {
  const d = await getDb();
  if (!d) throw new Error("Database connection not available");
  return d;
}

function calculateHealthScore(issues: HealthIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    switch (issue.severity) {
      case "critical":
        score -= 20;
        break;
      case "warning":
        score -= 10;
        break;
      case "info":
        score -= 3;
        break;
    }
  }
  return Math.max(0, Math.min(100, score));
}

function daysBetween(d1: Date, d2: Date): number {
  const ms = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

async function analyzeProject(
  project: {
    id: number;
    projectCode: string;
    status: string | null;
    budget: string | null;
  },
  stages: Array<{
    id: number;
    stageCode: string | null;
    status: string | null;
    plannedEndDate: string | null;
    outputJson: string | null;
    updatedAt: string;
  }>
): Promise<ProjectHealthReport> {
  const issues: HealthIssue[] = [];
  const now = new Date();
  const nowIso = now.toISOString();

  for (const stage of stages) {
    const stageCode = stage.stageCode || "unknown";

    // Check 1: Stage overdue (planEndDate < now && status not completed/approved)
    if (
      stage.plannedEndDate &&
      stage.status !== "Completed" &&
      stage.status !== "Skipped"
    ) {
      const endDate = new Date(stage.plannedEndDate);
      if (endDate < now) {
        const daysOverdue = daysBetween(endDate, now);
        const severity: HealthIssueSeverity =
          daysOverdue > 30
            ? "critical"
            : daysOverdue > 14
              ? "warning"
              : "info";
        issues.push({
          type: "stage_overdue",
          severity,
          message: "Stage " + stageCode + " is overdue by " + daysOverdue + " days (planned end: " + stage.plannedEndDate + ")",
          stageCode,
          detectedAt: nowIso,
        });
      }
    }

    // Check 2: Stage stuck too long (no status change in 14+ days)
    if (stage.status === "InProgress" && stage.updatedAt) {
      const lastUpdate = new Date(stage.updatedAt);
      const daysSinceUpdate = daysBetween(lastUpdate, now);
      if (daysSinceUpdate >= 14) {
        const severity: HealthIssueSeverity =
          daysSinceUpdate >= 30 ? "critical" : "warning";
        issues.push({
          type: "stage_stuck",
          severity,
          message: "Stage " + stageCode + " has been in progress for " + daysSinceUpdate + " days without status change",
          stageCode,
          detectedAt: nowIso,
        });
      }
    }

    // Check 3: Missing required outputs (outputJson empty for completed stages)
    if (stage.status === "Completed") {
      const hasOutputs =
        stage.outputJson &&
        stage.outputJson.trim() !== "" &&
        stage.outputJson !== "[]" &&
        stage.outputJson !== "{}";
      if (!hasOutputs) {
        issues.push({
          type: "missing_outputs",
          severity: "warning",
          message: "Stage " + stageCode + " is completed but has no recorded outputs",
          stageCode,
          detectedAt: nowIso,
        });
      }
    }
  }

  // Check 4: Budget overrun signals
  if (
    project.status === "Active" &&
    (!project.budget || parseFloat(project.budget) <= 0)
  ) {
    issues.push({
      type: "budget_missing",
      severity: "info",
      message: "Active project has no budget defined",
      stageCode: null,
      detectedAt: nowIso,
    });
  }

  const healthScore = calculateHealthScore(issues);

  return {
    projectId: project.id,
    projectCode: project.projectCode,
    healthScore,
    issues,
  };
}

// ===== Exported Service Functions =====

/** Scan all active projects for health indicators */
export async function scanAllProjects(): Promise<ProjectHealthReport[]> {
  const d = await requireDb();

  const projects = await d
    .select({
      id: schema.projectsV2.id,
      projectCode: schema.projectsV2.projectCode,
      status: schema.projectsV2.status,
      budget: schema.projectsV2.budget,
    })
    .from(schema.projectsV2)
    .where(eq(schema.projectsV2.status, "Active"));

  const reports: ProjectHealthReport[] = [];

  for (const project of projects) {
    const stages = await d
      .select({
        id: schema.projectStagesV2.id,
        stageCode: schema.projectStagesV2.stageCode,
        status: schema.projectStagesV2.status,
        plannedEndDate: schema.projectStagesV2.plannedEndDate,
        outputJson: schema.projectStagesV2.outputJson,
        updatedAt: schema.projectStagesV2.updatedAt,
      })
      .from(schema.projectStagesV2)
      .where(eq(schema.projectStagesV2.projectId, project.id));

    const report = await analyzeProject(project, stages);
    reports.push(report);

    // Persist health score
    await d.insert(schema.projectHealthScores).values({
      projectId: project.id,
      healthScore: report.healthScore,
      issueCount: report.issues.length,
      criticalCount: report.issues.filter((i) => i.severity === "critical").length,
      warningCount: report.issues.filter((i) => i.severity === "warning").length,
      infoCount: report.issues.filter((i) => i.severity === "info").length,
      issuesJson: JSON.stringify(report.issues),
    });
  }

  return reports;
}

/** Scan a single project for health indicators */
export async function scanSingleProject(
  projectId: number
): Promise<ProjectHealthReport> {
  const d = await requireDb();

  const projectRows = await d
    .select({
      id: schema.projectsV2.id,
      projectCode: schema.projectsV2.projectCode,
      status: schema.projectsV2.status,
      budget: schema.projectsV2.budget,
    })
    .from(schema.projectsV2)
    .where(eq(schema.projectsV2.id, projectId));

  if (projectRows.length === 0) {
    throw new Error("Project " + projectId + " not found");
  }

  const project = projectRows[0];

  const stages = await d
    .select({
      id: schema.projectStagesV2.id,
      stageCode: schema.projectStagesV2.stageCode,
      status: schema.projectStagesV2.status,
      plannedEndDate: schema.projectStagesV2.plannedEndDate,
      outputJson: schema.projectStagesV2.outputJson,
      updatedAt: schema.projectStagesV2.updatedAt,
    })
    .from(schema.projectStagesV2)
    .where(eq(schema.projectStagesV2.projectId, projectId));

  const report = await analyzeProject(project, stages);

  // Persist health score
  await d.insert(schema.projectHealthScores).values({
    projectId: project.id,
    healthScore: report.healthScore,
    issueCount: report.issues.length,
    criticalCount: report.issues.filter((i) => i.severity === "critical").length,
    warningCount: report.issues.filter((i) => i.severity === "warning").length,
    infoCount: report.issues.filter((i) => i.severity === "info").length,
    issuesJson: JSON.stringify(report.issues),
  });

  return report;
}

/** Get historical health scores for a project */
export async function getHealthHistory(
  projectId: number
): Promise<HealthScoreRecord[]> {
  const d = await requireDb();

  const rows = await d
    .select()
    .from(schema.projectHealthScores)
    .where(eq(schema.projectHealthScores.projectId, projectId))
    .orderBy(desc(schema.projectHealthScores.scannedAt))
    .limit(50);

  return rows;
}
