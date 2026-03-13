/**
 * Auto-seed RBAC roles & permissions on server startup.
 * Checks if grt_roles table is empty — if so, runs the full seed.
 * Fire-and-forget: errors are logged but never crash the server.
 */
import { sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("auto-seed-rbac");

export async function autoSeedRbac(): Promise<void> {
  try {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return; // No DB configured

    // Check if roles table has any rows
    const result = await db.execute(sql`SELECT count(*)::int AS cnt FROM grt_roles`);
    const rows = (result as any).rows ?? (result as any)[0] ?? [];
    const count = rows[0]?.cnt ?? rows[0]?.count ?? 0;

    if (Number(count) > 0) {
      log.info({ roleCount: count }, "RBAC roles already seeded, skipping");
      return;
    }

    log.info("grt_roles table is empty — auto-seeding RBAC permissions...");

    const { seedRbacPermissions } = await import("../seed-rbac-permissions");
    const stats = await seedRbacPermissions(db, {
      info: (msg: string) => log.info(msg),
      warn: (msg: string) => log.warn(msg),
    });

    log.info(
      { perms: stats.permCreated, roles: stats.rolesCreated, mappings: stats.mappingsCreated },
      "RBAC auto-seed complete"
    );
  } catch (err) {
    // Non-fatal: table may not exist yet (first migration), or DB unreachable
    log.warn({ err }, "RBAC auto-seed skipped (table may not exist yet)");
  }
}
