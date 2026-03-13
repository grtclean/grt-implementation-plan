/**
 * PLC Version Promotion Service
 * Handles dev → test → production promotion workflow with digital fingerprints
 */
import { createHash } from "crypto";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireDb } from "../db";
import { plcProjects, plcProgramModules, plcVersionHistory } from "../../drizzle/plc-program-schema";
import { createChildLogger } from "../lib/logger";
import { TRPCError } from "@trpc/server";

const log = createChildLogger("plc-version-promotion");

const PROMOTION_PATHS: Record<string, string> = {
  dev: "test",
  test: "production",
};

export async function computeDigitalFingerprint(plcProjectId: number): Promise<string> {
  const db = await requireDb();
  const modules = await db.select({
    moduleNumber: plcProgramModules.moduleNumber,
    sourceCode: plcProgramModules.sourceCode,
  })
    .from(plcProgramModules)
    .where(eq(plcProgramModules.plcProjectId, plcProjectId))
    .orderBy(plcProgramModules.moduleNumber)
    .limit(500);

  const hash = createHash("sha256");
  for (const mod of modules) {
    hash.update(`${mod.moduleNumber}:${mod.sourceCode || ""}`);
  }
  return hash.digest("hex");
}

export interface PromoteVersionParams {
  plcProjectId: number;
  from: "dev" | "test";
  to: "test" | "production";
  promotedBy: string;
  changeLog: string;
  testResults?: { fatPassed?: boolean; satPassed?: boolean; notes?: string };
}

export async function promoteVersion(params: PromoteVersionParams): Promise<{
  versionId: number;
  versionString: string;
  fingerprint: string;
}> {
  const { plcProjectId, from, to, promotedBy, changeLog, testResults } = params;
  const db = await requireDb();

  // Validate promotion path
  if (PROMOTION_PATHS[from] !== to) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid promotion path: ${from} → ${to}. Allowed: dev→test, test→production`,
    });
  }

  // Get current active version
  const [activeVersion] = await db.select().from(plcVersionHistory)
    .where(and(
      eq(plcVersionHistory.plcProjectId, plcProjectId),
      eq(plcVersionHistory.isActive, true),
    ))
    .orderBy(desc(plcVersionHistory.createdAt))
    .limit(1);

  // Validate source version type matches
  if (activeVersion && activeVersion.versionType !== from) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Active version is "${activeVersion.versionType}", cannot promote from "${from}"`,
    });
  }

  // dev→test: require all modules have non-empty sourceCode
  if (from === "dev") {
    const modules = await db.select({
      id: plcProgramModules.id,
      sourceCode: plcProgramModules.sourceCode,
      moduleName: plcProgramModules.moduleName,
    })
      .from(plcProgramModules)
      .where(eq(plcProgramModules.plcProjectId, plcProjectId))
      .limit(500);

    const emptyModules = modules.filter(m => !m.sourceCode || m.sourceCode.trim() === "");
    if (emptyModules.length > 0) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Cannot promote to test: ${emptyModules.length} module(s) have empty source code: ${emptyModules.map(m => m.moduleName).join(", ")}`,
      });
    }
  }

  // test→production: require FAT passed
  if (from === "test") {
    const tr = testResults || (activeVersion?.testResults as Record<string, unknown>) || {};
    if (!tr.fatPassed) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Cannot promote to production: FAT (Factory Acceptance Test) must pass first",
      });
    }
  }

  // Compute digital fingerprint
  const fingerprint = await computeDigitalFingerprint(plcProjectId);

  // Bump version string
  const baseVersion = activeVersion?.versionNumber || "1.0.0";
  const parts = baseVersion.split(".").map(Number);
  if (to === "test") parts[1] = (parts[1] || 0) + 1;
  if (to === "production") parts[0] = (parts[0] || 0) + 1;
  const newVersion = parts.join(".");
  const versionString = `V${newVersion}-${to}`;

  // Deactivate old version
  if (activeVersion) {
    await db.update(plcVersionHistory).set({ isActive: false })
      .where(eq(plcVersionHistory.id, activeVersion.id));
  }

  // Create new version
  const [newRow] = await db.insert(plcVersionHistory).values({
    plcProjectId,
    versionString,
    versionType: to,
    versionNumber: newVersion,
    changeLog,
    promotedFrom: activeVersion?.id || null,
    promotedBy,
    promotedAt: new Date().toISOString(),
    approvalStatus: "approved",
    testResults: testResults || {},
    isActive: true,
    isFrozen: to === "production",
    digitalFingerprint: fingerprint,
  }).returning({ id: plcVersionHistory.id });

  log.info({
    plcProjectId,
    from,
    to,
    versionString,
    fingerprint: fingerprint.slice(0, 12),
    promotedBy,
  }, "PLC version promoted");

  return {
    versionId: newRow.id,
    versionString,
    fingerprint,
  };
}

export async function verifyProductionIntegrity(versionId: number): Promise<{
  valid: boolean;
  storedFingerprint: string;
  computedFingerprint: string;
  versionString: string;
}> {
  const db = await requireDb();
  const [version] = await db.select().from(plcVersionHistory)
    .where(eq(plcVersionHistory.id, versionId))
    .limit(1);

  if (!version) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
  }

  const computed = await computeDigitalFingerprint(version.plcProjectId);
  const stored = (version as Record<string, unknown>).digitalFingerprint as string || "";

  return {
    valid: computed === stored,
    storedFingerprint: stored,
    computedFingerprint: computed,
    versionString: version.versionString,
  };
}

export async function assertNotFrozen(plcProjectId: number): Promise<void> {
  const db = await requireDb();
  const [active] = await db.select({
    isFrozen: plcVersionHistory.isFrozen,
    versionString: plcVersionHistory.versionString,
  })
    .from(plcVersionHistory)
    .where(and(
      eq(plcVersionHistory.plcProjectId, plcProjectId),
      eq(plcVersionHistory.isActive, true),
    ))
    .orderBy(desc(plcVersionHistory.createdAt))
    .limit(1);

  if (active?.isFrozen) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Production version ${active.versionString} is frozen. Create a new dev version first.`,
    });
  }
}
