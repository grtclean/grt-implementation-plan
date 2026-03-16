/**
 * Feedback and analytics functions
 * Auto-decomposed from server/db.ts
 */
import { eq, desc } from "drizzle-orm";
import { requireDb } from "./connection";
import { createChildLogger } from '../lib/logger';

const log = createChildLogger("db");
import {
  feedback, InsertFeedback, analyticsEvents, InsertAnalyticsEvent,
} from "../../drizzle/schema";

// ============= Feedback Functions =============

export async function createFeedback(data: InsertFeedback) {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot create feedback: database not available");
    return null;
  }

  try {
    const result = await db.insert(feedback).values(data);
    return { id: result[0].insertId };
  } catch (error) {
    log.error({ err: error }, "Failed to create feedback");
    throw error;
  }
}

export async function getAllFeedback() {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot get feedback: database not available");
    return [];
  }

  return db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(1000);
}

export async function updateFeedbackStatus(id: number, status: "pending" | "reviewed" | "resolved") {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot update feedback: database not available");
    return null;
  }

  await db.update(feedback).set({ status }).where(eq(feedback.id, id));
  return { success: true };
}

// ============= Analytics Functions =============

export async function trackEvent(data: InsertAnalyticsEvent) {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot track event: database not available");
    return null;
  }

  try {
    await db.insert(analyticsEvents).values(data);
    return { success: true };
  } catch (error) {
    log.error({ err: error }, "Failed to track event");
    throw error;
  }
}

export async function getAnalyticsEvents(limit = 100) {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot get analytics: database not available");
    return [];
  }

  return db.select().from(analyticsEvents).orderBy(desc(analyticsEvents.createdAt)).limit(limit);
}
