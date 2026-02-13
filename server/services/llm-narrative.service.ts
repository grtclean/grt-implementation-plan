/**
 * LLM Narrative Engine Service - Layer 3 of AI Early Warning System (Task #73)
 * Generates human-readable project status narratives using template-based approach.
 * Matches historical cases by equipment type, customer tier, current stage, and issue patterns.
 */

import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

// ===== Type Definitions =====

interface NarrativeResult {
  narrative: string;
  recommendations: string[];
  historicalMatch?: {
    matchedProjectId: number;
    similarityScore: number;
    outcome: string | null;
  };
}

interface HistoricalMatch {
  matchedProjectId: number;
  similarityScore: number;
  matchFactors: string[];
  outcome: string | null;
  lessonsLearned: string | null;
}

interface WeeklyDigestEntry {
  projectId: number;
  projectCode: string;
  healthScore: number;
  riskLevel: string;
  summary: string;
}

// ===== Helper Functions =====

async function requireDb() {
  const d = await getDb();
  if (!d) throw new Error("Database connection not available");
  return d;
}

function buildNarrativeFromTemplate(
  project: { id: number; projectCode: string; currentStage: string | null; status: string | null; priority: string | null },
  healthScore: number,
  issueCount: number,
  criticalCount: number,
  issues: Array<{ type: string; severity: string; message: string }>,
  stagesSummary: string
): string {
  const lines: string[] = [];

  // Executive Summary
  lines.push("=== Executive Summary ===");
  lines.push("Project " + project.projectCode + " is currently at stage " + (project.currentStage || "unknown") + ".");
  lines.push("Overall health score: " + healthScore + "/100. Status: " + (project.status || "unknown") + ". Priority: " + (project.priority || "P2") + ".");
  lines.push("");

  // Current Status
  lines.push("=== Current Status ===");
  lines.push(stagesSummary);
  lines.push("");

  // Risk Analysis
  lines.push("=== Risk Analysis ===");
  if (issueCount === 0) {
    lines.push("No issues detected. Project is on track.");
  } else {
    lines.push(issueCount + " issue(s) detected (" + criticalCount + " critical):");
    for (const issue of issues) {
      lines.push("  [" + issue.severity.toUpperCase() + "] " + issue.message);
    }
  }
  lines.push("");

  // Recommendations
  lines.push("=== Recommendations ===");
  if (criticalCount > 0) {
    lines.push("- URGENT: Address critical issues immediately to prevent project delays.");
    lines.push("- Schedule an emergency review meeting with stakeholders.");
  }
  if (healthScore < 70) {
    lines.push("- Consider reallocating resources to address bottlenecks.");
    lines.push("- Review project timeline and adjust milestones if necessary.");
  }
  if (healthScore >= 70 && healthScore < 90) {
    lines.push("- Monitor warning-level issues to prevent escalation.");
    lines.push("- Ensure stage outputs are properly documented.");
  }
  if (healthScore >= 90) {
    lines.push("- Project is in good health. Continue current trajectory.");
    lines.push("- Consider documenting best practices for team reference.");
  }

  return lines.join("\n");
}

function extractRecommendations(healthScore: number, criticalCount: number): string[] {
  const recs: string[] = [];
  if (criticalCount > 0) {
    recs.push("Address critical issues immediately to prevent project delays.");
    recs.push("Schedule an emergency review meeting with stakeholders.");
  }
  if (healthScore < 70) {
    recs.push("Consider reallocating resources to address bottlenecks.");
    recs.push("Review project timeline and adjust milestones if necessary.");
  }
  if (healthScore >= 70 && healthScore < 90) {
    recs.push("Monitor warning-level issues to prevent escalation.");
    recs.push("Ensure stage outputs are properly documented.");
  }
  if (healthScore >= 90) {
    recs.push("Project is in good health. Continue current trajectory.");
  }
  if (recs.length === 0) {
    recs.push("No specific recommendations at this time.");
  }
  return recs;
}

// ===== Exported Service Functions =====

/** Generate a human-readable project status narrative */
export async function generateProjectNarrative(projectId: number): Promise<NarrativeResult> {
  const d = await requireDb();

  // Get project details
  const projectRows = await d
    .select({
      id: schema.projectsV2.id,
      projectCode: schema.projectsV2.projectCode,
      currentStage: schema.projectsV2.currentStage,
      status: schema.projectsV2.status,
      priority: schema.projectsV2.priority,
    })
    .from(schema.projectsV2)
    .where(eq(schema.projectsV2.id, projectId));

  if (projectRows.length === 0) {
    throw new Error("Project " + projectId + " not found");
  }

  const project = projectRows[0];

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

  // Parse issues
  let issues: Array<{ type: string; severity: string; message: string }> = [];
  if (latestHealth && latestHealth.issuesJson) {
    try {
      issues = JSON.parse(latestHealth.issuesJson);
    } catch (e) {
      issues = [];
    }
  }

  // Get stages summary
  const stages = await d
    .select({
      stageCode: schema.projectStagesV2.stageCode,
      status: schema.projectStagesV2.status,
      completionPercent: schema.projectStagesV2.completionPercent,
    })
    .from(schema.projectStagesV2)
    .where(eq(schema.projectStagesV2.projectId, projectId));

  const stagesSummary = stages
    .map((s) => (s.stageCode || "?") + ": " + (s.status || "unknown") + " (" + (s.completionPercent || 0) + "%)")
    .join(", ");

  const narrative = buildNarrativeFromTemplate(
    project, healthScore, issueCount, criticalCount, issues, stagesSummary
  );
  const recommendations = extractRecommendations(healthScore, criticalCount);

  // Check for historical match
  const matchRows = await d
    .select()
    .from(schema.historicalCaseMatches)
    .where(eq(schema.historicalCaseMatches.projectId, projectId))
    .orderBy(desc(schema.historicalCaseMatches.similarityScore))
    .limit(1);

  const historicalMatch = matchRows.length > 0
    ? {
        matchedProjectId: matchRows[0].matchedProjectId,
        similarityScore: matchRows[0].similarityScore,
        outcome: matchRows[0].outcome,
      }
    : undefined;

  return { narrative, recommendations, historicalMatch };
}

/** Find similar past projects by equipment type, customer tier, current stage, issue patterns */
export async function matchHistoricalCases(projectId: number): Promise<HistoricalMatch[]> {
  const d = await requireDb();

  // Get current project details
  const projectRows = await d
    .select({
      id: schema.projectsV2.id,
      currentStage: schema.projectsV2.currentStage,
      priority: schema.projectsV2.priority,
      customerId: schema.projectsV2.customerId,
    })
    .from(schema.projectsV2)
    .where(eq(schema.projectsV2.id, projectId));

  if (projectRows.length === 0) {
    throw new Error("Project " + projectId + " not found");
  }

  const currentProject = projectRows[0];

  // Find completed projects for comparison
  const completedProjects = await d
    .select({
      id: schema.projectsV2.id,
      projectCode: schema.projectsV2.projectCode,
      currentStage: schema.projectsV2.currentStage,
      priority: schema.projectsV2.priority,
      customerId: schema.projectsV2.customerId,
      status: schema.projectsV2.status,
    })
    .from(schema.projectsV2)
    .where(eq(schema.projectsV2.status, "Completed"))
    .limit(50);

  const matches: HistoricalMatch[] = [];

  for (const past of completedProjects) {
    if (past.id === projectId) continue;

    let score = 0;
    const matchFactors: string[] = [];

    // Match by customer (same customer)
    if (past.customerId === currentProject.customerId) {
      score += 0.3;
      matchFactors.push("same_customer");
    }

    // Match by priority/tier
    if (past.priority === currentProject.priority) {
      score += 0.2;
      matchFactors.push("same_priority");
    }

    // Match by current stage
    if (past.currentStage === currentProject.currentStage) {
      score += 0.3;
      matchFactors.push("same_stage");
    }

    // Match by similar priority class (P0-P1 vs P2-P3)
    const currentTier1 = currentProject.priority === "P0" || currentProject.priority === "P1";
    const pastTier1 = past.priority === "P0" || past.priority === "P1";
    if (currentTier1 === pastTier1 && past.priority !== currentProject.priority) {
      score += 0.1;
      matchFactors.push("similar_tier");
    }

    // Only include if there is at least some similarity
    if (score > 0.1) {
      const outcome = past.status === "Completed" ? "completed_successfully" : past.status;
      matches.push({
        matchedProjectId: past.id,
        similarityScore: Math.round(score * 100) / 100,
        matchFactors,
        outcome,
        lessonsLearned: null,
      });
    }
  }

  // Sort by similarity and take top 3
  matches.sort((a, b) => b.similarityScore - a.similarityScore);
  const topMatches = matches.slice(0, 3);

  // Persist matches
  for (const match of topMatches) {
    await d.insert(schema.historicalCaseMatches).values({
      projectId,
      matchedProjectId: match.matchedProjectId,
      similarityScore: match.similarityScore,
      matchFactors: JSON.stringify(match.matchFactors),
      outcome: match.outcome,
      lessonsLearned: match.lessonsLearned,
    });
  }

  return topMatches;
}

/** Generate weekly digest for all active projects */
export async function generateWeeklyDigest(): Promise<WeeklyDigestEntry[]> {
  const d = await requireDb();

  const projects = await d
    .select({
      id: schema.projectsV2.id,
      projectCode: schema.projectsV2.projectCode,
      currentStage: schema.projectsV2.currentStage,
      priority: schema.projectsV2.priority,
    })
    .from(schema.projectsV2)
    .where(eq(schema.projectsV2.status, "Active"));

  const digest: WeeklyDigestEntry[] = [];

  for (const project of projects) {
    // Get latest health score
    const healthRows = await d
      .select()
      .from(schema.projectHealthScores)
      .where(eq(schema.projectHealthScores.projectId, project.id))
      .orderBy(desc(schema.projectHealthScores.scannedAt))
      .limit(1);

    const healthScore = healthRows.length > 0 ? healthRows[0].healthScore : 100;
    const issueCount = healthRows.length > 0 ? (healthRows[0].issueCount || 0) : 0;
    const criticalCount = healthRows.length > 0 ? (healthRows[0].criticalCount || 0) : 0;

    // Determine risk level from health score
    let riskLevel = "low";
    if (healthScore < 40) riskLevel = "critical";
    else if (healthScore < 60) riskLevel = "high";
    else if (healthScore < 80) riskLevel = "medium";

    const summary =
      "Project " + project.projectCode + " at stage " + (project.currentStage || "?") +
      ". Health: " + healthScore + "/100. " +
      issueCount + " issues (" + criticalCount + " critical). Priority: " + (project.priority || "P2") + ".";

    digest.push({
      projectId: project.id,
      projectCode: project.projectCode,
      healthScore,
      riskLevel,
      summary,
    });
  }

  // Sort by health score ascending (worst health first)
  digest.sort((a, b) => a.healthScore - b.healthScore);
  return digest;
}
