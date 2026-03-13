/**
 * Performance Prediction Service — Linear regression on historical AEI scores
 *
 * Given 6+ months of aei_monthly_scores, computes trend line and extrapolates.
 * Flags employees with declining trajectories for proactive intervention.
 */

import { createChildLogger } from "../lib/logger";
import { requireDb } from "../db";
import { aeiMonthlyScores } from "../../drizzle/aei-extended-schema";
import { eq, desc, and } from "drizzle-orm";

const log = createChildLogger("performance-prediction");

export interface PredictionResult {
  userId: number;
  userName: string;
  currentScore: number;
  trendSlope: number;         // score points per month (negative = declining)
  trendIntercept: number;
  r2: number;                 // R-squared (goodness of fit)
  predicted3Months: number[]; // next 3 months forecast
  riskFlag: "stable" | "declining" | "at_risk" | "improving";
  confidence: "high" | "medium" | "low";
  dataPoints: number;
}

/**
 * Predict performance for a single user.
 * Requires at least 3 months of data (6+ preferred for high confidence).
 */
export async function predictUserPerformance(userId: number): Promise<PredictionResult | null> {
  const db = await requireDb();

  const scores = await db.select({
    month: aeiMonthlyScores.month,
    composite: aeiMonthlyScores.compositeAeiScore,
    userName: aeiMonthlyScores.userName,
  })
    .from(aeiMonthlyScores)
    .where(eq(aeiMonthlyScores.userId, userId))
    .orderBy(aeiMonthlyScores.month)
    .limit(24);

  if (scores.length < 3) return null;

  const userName = scores[0].userName;
  const x = scores.map((_, i) => i);
  const y = scores.map(s => s.composite || 0);

  const { slope, intercept, r2 } = linearRegression(x, y);
  const n = x.length;

  // Predict next 3 months
  const predicted3Months = [
    Math.max(0, Math.min(100, slope * (n) + intercept)),
    Math.max(0, Math.min(100, slope * (n + 1) + intercept)),
    Math.max(0, Math.min(100, slope * (n + 2) + intercept)),
  ].map(v => Math.round(v * 10) / 10);

  // Determine risk flag
  let riskFlag: PredictionResult["riskFlag"] = "stable";
  if (slope < -2) riskFlag = "at_risk";
  else if (slope < -0.5) riskFlag = "declining";
  else if (slope > 1) riskFlag = "improving";

  const confidence: PredictionResult["confidence"] =
    scores.length >= 6 ? "high" : scores.length >= 4 ? "medium" : "low";

  const currentScore = y[y.length - 1];

  log.info({ userId, slope: Math.round(slope * 100) / 100, riskFlag, dataPoints: scores.length }, "Performance predicted");

  return {
    userId, userName, currentScore, trendSlope: Math.round(slope * 100) / 100,
    trendIntercept: Math.round(intercept * 100) / 100, r2: Math.round(r2 * 1000) / 1000,
    predicted3Months, riskFlag, confidence, dataPoints: scores.length,
  };
}

/**
 * Get all at-risk employees (declining or at_risk trend).
 */
export async function getAtRiskEmployees(limit: number = 20): Promise<PredictionResult[]> {
  const db = await requireDb();

  // Get distinct users with recent scores
  const recentUsers = await db.selectDistinct({ userId: aeiMonthlyScores.userId })
    .from(aeiMonthlyScores)
    .limit(200);

  const results: PredictionResult[] = [];
  for (const { userId } of recentUsers) {
    const prediction = await predictUserPerformance(userId);
    if (prediction && (prediction.riskFlag === "declining" || prediction.riskFlag === "at_risk")) {
      results.push(prediction);
    }
  }

  results.sort((a, b) => a.trendSlope - b.trendSlope); // worst first
  log.info({ atRiskCount: results.length }, "At-risk employee scan complete");
  return results.slice(0, limit);
}

/**
 * Simple least-squares linear regression.
 * Returns slope, intercept, and R-squared.
 */
function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: y[0] || 0, r2: 0 };

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, xi, i) => a + xi * y[i], 0);
  const sumX2 = x.reduce((a, xi) => a + xi * xi, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  const ssRes = y.reduce((a, yi, i) => a + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
  const ssTot = y.reduce((a, yi) => a + Math.pow(yi - meanY, 2), 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}
