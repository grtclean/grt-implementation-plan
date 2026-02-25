/**
 * Project 360 Cockpit — Aggregation Router
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  ARCHITECTURE NOTE (CTO Directive — Bottom-Up Paradigm)         │
 * │                                                                  │
 * │  Phase 0 (current): Each DB slice wrapped in isolated try/catch. │
 * │    If a table doesn't exist or the query fails, that slice       │
 * │    returns null — never crashes the whole endpoint.              │
 * │                                                                  │
 * │  Phase 2 (planned): Replace raw SQL aggregation with Redis       │
 * │    read-through cache. Key pattern:                              │
 * │      p360:{projectId}:{slice}  TTL=60s                           │
 * │    Invalidation via Drizzle afterInsert/afterUpdate hooks.       │
 * │                                                                  │
 * │  Phase 3 (planned): Add PII desensitization middleware for       │
 * │    cross-border compliance (Data Border Pillar).                 │
 * └──────────────────────────────────────────────────────────────────┘
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, and, sql, count, ne } from "drizzle-orm";
import {
  projects,
  costEstimates,
  costRecords,
  fmeaDocuments,
  fmeaItems,
  eightDReports,
  capaRecords,
  fatTestPlans,
} from "../../drizzle/schema";
import { grtVaultFiles, engineeringChangeOrders } from "../../drizzle/digital-thread-schema";
import { projectProcessInstances } from "../../drizzle/production-process-schema";

// Null-objects — returned when a slice query fails (table missing, etc.)
const NULL_COST = null;
const NULL_PRODUCTION = null;
const NULL_VAULT = null;
const NULL_QUALITY = null;
const NULL_ACCEPTANCE = null;

/** Wraps an async DB query so that ANY failure (including missing table) returns null */
async function safeSlice<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    // Phase 0: swallow — the table may not exist yet.
    // In Phase 2 this will log to structured telemetry.
    return null;
  }
}

export const project360Router = router({
  overview: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const pid = input.projectId;

      const [
        projectSlice,
        costSlice,
        productionSlice,
        vaultSlice,
        qualitySlice,
        acceptanceSlice,
      ] = await Promise.allSettled([
        // 1. Project header
        safeSlice(async () => {
          const rows = await db
            .select({
              id: projects.id,
              name: projects.name,
              status: projects.status,
              currentPhase: projects.currentPhase,
              healthStatus: projects.healthStatus,
              budget: projects.budget,
              actualCost: projects.actualCost,
              completionPercent: projects.completionPercent,
            })
            .from(projects)
            .where(eq(projects.id, pid));
          return rows[0] ?? null;
        }),

        // 2. Cost: budget vs spent
        safeSlice(async () => {
          const [budgetRow] = await db
            .select({
              budget: sql<number>`coalesce(sum(${costEstimates.estimatedAmount}), 0)`,
            })
            .from(costEstimates)
            .where(eq(costEstimates.projectId, pid));

          const [spentRow] = await db
            .select({
              spent: sql<number>`coalesce(sum(${costRecords.amount}), 0)`,
            })
            .from(costRecords)
            .where(eq(costRecords.projectId, pid));

          const budget = Number(budgetRow?.budget ?? 0);
          const spent = Number(spentRow?.spent ?? 0);
          return { budget, spent, remaining: budget - spent };
        }),

        // 3. Production: T1-T15 stages
        safeSlice(async () => {
          const stages = await db
            .select({
              code: projectProcessInstances.processCode,
              status: projectProcessInstances.status,
              completion: projectProcessInstances.completionPercentage,
            })
            .from(projectProcessInstances)
            .where(eq(projectProcessInstances.projectId, pid));

          const completed = stages.filter((s) => s.status === "COMPLETED").length;
          const inProgress = stages.filter((s) => s.status === "IN_PROGRESS").length;
          const blocked = stages.filter((s) => s.status === "BLOCKED" || s.status === "ON_HOLD").length;

          return { stages, completed, inProgress, blocked };
        }),

        // 4. Vault: file & ECO summary
        safeSlice(async () => {
          const fileRows = await db
            .select({ fileType: grtVaultFiles.fileType, cnt: count() })
            .from(grtVaultFiles)
            .where(eq(grtVaultFiles.projectId, pid))
            .groupBy(grtVaultFiles.fileType);

          const byType: Record<string, number> = {};
          let totalFiles = 0;
          for (const r of fileRows) {
            byType[r.fileType] = Number(r.cnt);
            totalFiles += Number(r.cnt);
          }

          const ecoRows = await db
            .select({ status: engineeringChangeOrders.status, cnt: count() })
            .from(engineeringChangeOrders)
            .where(eq(engineeringChangeOrders.projectId, pid))
            .groupBy(engineeringChangeOrders.status);

          let ecoTotal = 0;
          let ecoDraft = 0;
          for (const r of ecoRows) {
            ecoTotal += Number(r.cnt);
            if (r.status === "draft") ecoDraft += Number(r.cnt);
          }

          return { totalFiles, byType, ecoTotal, ecoDraft };
        }),

        // 5. Quality: FMEA + 8D + CAPA
        safeSlice(async () => {
          const [fmeaRow] = await db
            .select({ cnt: count() })
            .from(fmeaDocuments)
            .where(eq(fmeaDocuments.projectId, pid));

          const [rpnRow] = await db
            .select({ maxRpn: sql<number>`coalesce(max(${fmeaItems.rpn}), 0)` })
            .from(fmeaItems)
            .innerJoin(fmeaDocuments, eq(fmeaItems.fmeaDocumentId, fmeaDocuments.id))
            .where(eq(fmeaDocuments.projectId, pid));

          const [open8dRow] = await db
            .select({ cnt: count() })
            .from(eightDReports)
            .where(and(eq(eightDReports.projectId, pid), ne(eightDReports.currentStep, "closed")));

          const [overdueCapaRow] = await db
            .select({ cnt: count() })
            .from(capaRecords)
            .where(and(
              eq(capaRecords.projectId, pid),
              ne(capaRecords.status, "closed"),
              ne(capaRecords.status, "verified"),
            ));

          return {
            fmeaCount: Number(fmeaRow?.cnt ?? 0),
            maxRpn: Number(rpnRow?.maxRpn ?? 0),
            open8Ds: Number(open8dRow?.cnt ?? 0),
            overdueCapas: Number(overdueCapaRow?.cnt ?? 0),
          };
        }),

        // 6. Acceptance: FAT/SAT
        safeSlice(async () => {
          const rows = await db
            .select({
              planType: fatTestPlans.planType,
              status: fatTestPlans.status,
              cnt: count(),
            })
            .from(fatTestPlans)
            .where(eq(fatTestPlans.projectId, pid))
            .groupBy(fatTestPlans.planType, fatTestPlans.status);

          let fatTotal = 0, fatCompleted = 0, satTotal = 0, satCompleted = 0;
          for (const r of rows) {
            const c = Number(r.cnt);
            if (r.planType === "FAT") {
              fatTotal += c;
              if (r.status === "completed") fatCompleted += c;
            } else if (r.planType === "SAT") {
              satTotal += c;
              if (r.status === "completed") satCompleted += c;
            }
          }
          return { fatTotal, fatCompleted, satTotal, satCompleted };
        }),
      ]);

      return {
        project: projectSlice.status === "fulfilled" ? projectSlice.value : null,
        cost: costSlice.status === "fulfilled" ? costSlice.value : NULL_COST,
        production: productionSlice.status === "fulfilled" ? productionSlice.value : NULL_PRODUCTION,
        vault: vaultSlice.status === "fulfilled" ? vaultSlice.value : NULL_VAULT,
        quality: qualitySlice.status === "fulfilled" ? qualitySlice.value : NULL_QUALITY,
        acceptance: acceptanceSlice.status === "fulfilled" ? acceptanceSlice.value : NULL_ACCEPTANCE,
      };
    }),
});
