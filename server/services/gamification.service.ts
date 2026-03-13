/**
 * Gamification Service (Task #75)
 * Employee XP, level, and achievement tracking.
 */

import { requireDb } from "../db";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import * as schema from "../../drizzle/schema";

const ACTION_POINTS: Record<string, number> = {
  complete_stage_review: 50,
  submit_document: 20,
  resolve_issue: 30,
  mentor_peer: 40,
  achieve_milestone: 100,
};

const LEVEL_TITLES: Record<number, string> = {
  1: "Newcomer", 5: "Contributor", 10: "Specialist",
  15: "Expert", 20: "Master", 30: "Legend", 40: "Grandmaster", 50: "Architect",
};

export function calculateLevel(xp: number): { level: number; title: string; xpForNext: number; progress: number } {
  const level = Math.min(50, Math.floor(Math.sqrt(xp / 50)) + 1);
  const currentLevelXP = Math.pow(level - 1, 2) * 50;
  const nextLevelXP = Math.pow(level, 2) * 50;
  const progress = nextLevelXP > currentLevelXP ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 : 100;
  const titles = Object.entries(LEVEL_TITLES).reverse();
  const title = titles.find(([l]) => level >= Number(l))?.[1] ?? "Newcomer";
  return { level, title, xpForNext: nextLevelXP - xp, progress: Math.min(100, progress) };
}

export async function grantXP(userId: number, action: string, points?: number, sourceType?: string, sourceId?: number): Promise<{ xpAwarded: number; newTotal: number; levelUp: boolean }> {
  const db = await requireDb();
  const xpAmount = points ?? ACTION_POINTS[action] ?? 10;
  await db.insert(schema.employeeXP).values({ userId, action, points: xpAmount, sourceType, sourceId });

  const totalResult = await db.select({ total: sql<number>`COALESCE(SUM(points),0)` }).from(schema.employeeXP).where(eq(schema.employeeXP.userId, userId));
  const newTotal = totalResult[0]?.total ?? 0;
  const { level } = calculateLevel(newTotal);
  const existing = await db.select().from(schema.employeeLevels).where(eq(schema.employeeLevels.userId, userId)).limit(1000);
  const oldLevel = existing[0]?.currentLevel ?? 0;
  const { title } = calculateLevel(newTotal);

  if (existing.length === 0) {
    await db.insert(schema.employeeLevels).values({ userId, totalXP: newTotal, currentLevel: level, currentTitle: title });
  } else {
    await db.update(schema.employeeLevels).set({ totalXP: newTotal, currentLevel: level, currentTitle: title, updatedAt: new Date() }).where(eq(schema.employeeLevels.userId, userId));
  }
  return { xpAwarded: xpAmount, newTotal, levelUp: level > oldLevel };
}

export async function getEmployeeProfile(userId: number) {
  const db = await requireDb();
  const levelData = await db.select().from(schema.employeeLevels).where(eq(schema.employeeLevels.userId, userId)).limit(1000);
  const achievements = await db.select().from(schema.employeeAchievements).where(eq(schema.employeeAchievements.userId, userId)).limit(1000);
  const recentXP = await db.select().from(schema.employeeXP).where(eq(schema.employeeXP.userId, userId)).orderBy(desc(schema.employeeXP.awardedAt)).limit(20);
  const totalXP = levelData[0]?.totalXP ?? 0;
  const levelInfo = calculateLevel(totalXP);
  return { userId, xp: totalXP, ...levelInfo, achievements, recentXP };
}

const ACHIEVEMENTS = [
  { code: "first_review", name: "First Review", desc: "Complete your first stage review", tier: "bronze", check: (xpList: {action:string}[]) => xpList.some(x => x.action === "complete_stage_review") },
  { code: "doc_master", name: "Document Master", desc: "Submit 10 documents", tier: "silver", check: (xpList: {action:string}[]) => xpList.filter(x => x.action === "submit_document").length >= 10 },
  { code: "problem_solver", name: "Problem Solver", desc: "Resolve 5 issues", tier: "silver", check: (xpList: {action:string}[]) => xpList.filter(x => x.action === "resolve_issue").length >= 5 },
  { code: "mentor", name: "Mentor", desc: "Mentor 3 peers", tier: "gold", check: (xpList: {action:string}[]) => xpList.filter(x => x.action === "mentor_peer").length >= 3 },
  { code: "milestone_king", name: "Milestone King", desc: "Achieve 5 milestones", tier: "platinum", check: (xpList: {action:string}[]) => xpList.filter(x => x.action === "achieve_milestone").length >= 5 },
];

export async function checkAchievements(userId: number) {
  const db = await requireDb();
  const xpHistory = await db.select().from(schema.employeeXP).where(eq(schema.employeeXP.userId, userId)).limit(1000);
  const existing = await db.select().from(schema.employeeAchievements).where(eq(schema.employeeAchievements.userId, userId)).limit(1000);
  const existingCodes = new Set(existing.map(a => a.achievementCode));
  const newAchievements: string[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (!existingCodes.has(ach.code) && ach.check(xpHistory)) {
      await db.insert(schema.employeeAchievements).values({ userId, achievementCode: ach.code,
        achievementName: ach.name, description: ach.desc, tier: ach.tier });
      newAchievements.push(ach.code);
    }
  }
  return { checked: ACHIEVEMENTS.length, newAchievements };
}

export async function getLeaderboard(period?: string) {
  const db = await requireDb();
  const leaders = await db.select().from(schema.employeeLevels).orderBy(desc(schema.employeeLevels.totalXP)).limit(50);
  return leaders.map((l, idx) => ({ rank: idx + 1, userId: l.userId, totalXP: l.totalXP ?? 0,
    level: l.currentLevel ?? 1, title: l.currentTitle ?? "Newcomer" }));
}