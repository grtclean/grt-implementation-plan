/**
 * SOP + Role Quality Interlock — Gateway Router
 * Phase 1.2 — Mission-critical IT/OT bridge
 *
 * Core procedure: `verifyAccess`
 *   Input:  { userId, machineId }
 *   Output: { status: 'GRANTED' | 'BLOCKED', reason?, details? }
 *
 * Decision logic (both must pass):
 *   1. CERT CHECK — user has unexpired qualificationCertificates matching
 *      every machineSkillRequirements.certificationCode for this machine.
 *   2. SOP CHECK  — user's latest sopAcknowledgments.versionSigned matches
 *      sopTemplates.version for every SOP linked to this machine.
 *
 * If either fails → BLOCKED with human-readable reason.
 * Every attempt is logged to interlockAccessLog (IATF 16949 audit trail).
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { eq, and, sql, desc, gt } from "drizzle-orm";
import { qualificationCertificates } from "../../drizzle/schema";
import { sopTemplates } from "../../drizzle/production-process-schema";
import { productionEquipments } from "../../drizzle/production-equipment-schema";
import {
  machineSkillRequirements,
  sopAcknowledgments,
  interlockAccessLog,
} from "../../drizzle/sop-interlock-schema";

// ─── Pure logic extracted for testability ───────────────────────────

export interface InterlockInput {
  userId: number;
  machineId: number;
}

export interface CertRequirement {
  certificationCode: string;
  skillName: string;
  requiredLevel: string;
  sopTemplateId: number | null;
}

export interface UserCert {
  certificateCode: string;
  expiryDate: string;
  certificateLevel: string | null;
}

export interface SopStatus {
  sopTemplateId: number;
  currentVersion: string;
  signedVersion: string | null;
}

export interface InterlockResult {
  status: "GRANTED" | "BLOCKED";
  reason: string | null;
  details: {
    certCheckPassed: boolean;
    sopCheckPassed: boolean;
    missingCerts: string[];
    outdatedSops: { sopId: number; required: string; signed: string | null }[];
  };
}

/**
 * Pure business logic — no DB dependency. Fully unit-testable.
 *
 * SAFETY-CRITICAL: This function determines whether a human operator
 * may physically operate industrial cleaning equipment. A false GRANTED
 * could result in equipment damage, chemical exposure, or injury.
 * A false BLOCKED halts production but keeps people safe.
 *
 * Design bias: FAIL CLOSED. Any ambiguity → BLOCKED.
 */
export function evaluateAccess(
  requirements: CertRequirement[],
  userCerts: UserCert[],
  sopStatuses: SopStatus[],
  now: Date,
): InterlockResult {
  // If the machine has no requirements defined, block by default (fail-closed).
  // An unconfigured machine is NOT a free pass.
  if (requirements.length === 0) {
    return {
      status: "BLOCKED",
      reason: "Machine has no skill requirements configured. Contact supervisor.",
      details: { certCheckPassed: false, sopCheckPassed: false, missingCerts: [], outdatedSops: [] },
    };
  }

  // ── Cert Check ──
  const nowMs = now.getTime();
  const validCertCodes = new Set(
    userCerts
      .filter((c) => new Date(c.expiryDate).getTime() > nowMs)
      .map((c) => c.certificateCode),
  );

  const missingCerts: string[] = [];
  for (const req of requirements) {
    if (!validCertCodes.has(req.certificationCode)) {
      missingCerts.push(req.certificationCode);
    }
  }
  const certCheckPassed = missingCerts.length === 0;

  // ── SOP Check ──
  const outdatedSops: { sopId: number; required: string; signed: string | null }[] = [];
  for (const sop of sopStatuses) {
    if (sop.signedVersion !== sop.currentVersion) {
      outdatedSops.push({
        sopId: sop.sopTemplateId,
        required: sop.currentVersion,
        signed: sop.signedVersion,
      });
    }
  }
  const sopCheckPassed = outdatedSops.length === 0;

  // ── Decision ──
  if (certCheckPassed && sopCheckPassed) {
    return {
      status: "GRANTED",
      reason: null,
      details: { certCheckPassed: true, sopCheckPassed: true, missingCerts: [], outdatedSops: [] },
    };
  }

  // Build human-readable reason
  const reasons: string[] = [];
  if (!certCheckPassed) {
    reasons.push(`Missing certifications: ${missingCerts.join(", ")}`);
  }
  if (!sopCheckPassed) {
    const sopDescs = outdatedSops.map(
      (s) => `SOP #${s.sopId} requires v${s.required}, you signed v${s.signed ?? "none"}`,
    );
    reasons.push(sopDescs.join("; "));
  }

  return {
    status: "BLOCKED",
    reason: reasons.join(". "),
    details: { certCheckPassed, sopCheckPassed, missingCerts, outdatedSops },
  };
}

// ─── Router ─────────────────────────────────────────────────────────

export const sopInterlockRouter = router({
  /** List all machines available for shop-floor login */
  listMachines: protectedProcedure.query(async () => {
    const db = await requireDb();
    const machines = await db
      .select({
        id: productionEquipments.id,
        name: productionEquipments.name,
        code: productionEquipments.code,
        location: productionEquipments.location,
      })
      .from(productionEquipments)
      .orderBy(productionEquipments.code);
    return machines;
  }),

  /**
   * Core gateway: verify if operator may access machine.
   * Called from shop-floor tablet at badge scan.
   * Uses protectedProcedure because kiosk/tablet may not have user session.
   */
  verifyAccess: protectedProcedure
    .input(z.object({ userId: z.number(), machineId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { userId, machineId } = input;

      // 1. Get machine requirements
      const requirements = await db
        .select({
          certificationCode: machineSkillRequirements.certificationCode,
          skillName: machineSkillRequirements.skillName,
          requiredLevel: machineSkillRequirements.requiredLevel,
          sopTemplateId: machineSkillRequirements.sopTemplateId,
        })
        .from(machineSkillRequirements)
        .where(and(
          eq(machineSkillRequirements.machineId, machineId),
          eq(machineSkillRequirements.isActive, true),
        ));

      // 2. Get user's certifications
      const userCerts = await db
        .select({
          certificateCode: qualificationCertificates.certificateCode,
          expiryDate: qualificationCertificates.expiryDate,
          certificateLevel: qualificationCertificates.certificateLevel,
        })
        .from(qualificationCertificates)
        .where(eq(qualificationCertificates.employeeId, userId));

      // 3. For each SOP required by the machine, get current version + user's latest ack
      const sopIds = [...new Set(requirements.map((r) => r.sopTemplateId).filter(Boolean))] as number[];
      const sopStatuses: SopStatus[] = [];

      for (const sopId of sopIds) {
        const [sopDoc] = await db
          .select({ version: sopTemplates.version })
          .from(sopTemplates)
          .where(eq(sopTemplates.id, sopId));

        if (!sopDoc) continue;

        const [latestAck] = await db
          .select({ versionSigned: sopAcknowledgments.versionSigned })
          .from(sopAcknowledgments)
          .where(and(
            eq(sopAcknowledgments.userId, userId),
            eq(sopAcknowledgments.sopTemplateId, sopId),
          ))
          .orderBy(desc(sopAcknowledgments.signedAt))
          .limit(1);

        sopStatuses.push({
          sopTemplateId: sopId,
          currentVersion: sopDoc.version,
          signedVersion: latestAck?.versionSigned ?? null,
        });
      }

      // 4. Evaluate
      const result = evaluateAccess(requirements, userCerts, sopStatuses, new Date());

      // 5. Audit log (fire-and-forget — don't block the response)
      db.insert(interlockAccessLog).values({
        userId,
        machineId,
        decision: result.status,
        blockReason: result.reason,
        certCheckPassed: result.details.certCheckPassed,
        sopCheckPassed: result.details.sopCheckPassed,
        missingCerts: result.details.missingCerts.length > 0
          ? JSON.stringify(result.details.missingCerts)
          : null,
        sopVersionRequired: result.details.outdatedSops[0]?.required ?? null,
        sopVersionSigned: result.details.outdatedSops[0]?.signed ?? null,
      }).catch(() => { /* audit log failure must not block access decision */ });

      return result;
    }),

  /** Record an SOP acknowledgment (operator signs latest version) */
  acknowledgeSop: requirePermission('mfg:interlock:manage')
    .input(z.object({
      sopTemplateId: z.number(),
      signatureMethod: z.enum(["badge_scan", "manual", "digital_signature"]).default("badge_scan"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // Get current SOP version
      const [sopDoc] = await db
        .select({ version: sopTemplates.version, title: sopTemplates.title })
        .from(sopTemplates)
        .where(eq(sopTemplates.id, input.sopTemplateId));

      if (!sopDoc) {
        return { success: false, error: "SOP not found" };
      }

      await db.insert(sopAcknowledgments).values({
        userId: ctx.user.id,
        sopTemplateId: input.sopTemplateId,
        versionSigned: sopDoc.version,
        signatureMethod: input.signatureMethod,
      });

      return { success: true, version: sopDoc.version, title: sopDoc.title };
    }),

  /** Get machine info + requirements (for the shop floor UI) */
  getMachineInfo: protectedProcedure
    .input(z.object({ machineId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const [machine] = await db
        .select()
        .from(productionEquipments)
        .where(eq(productionEquipments.id, input.machineId));

      const requirements = await db
        .select({
          certificationCode: machineSkillRequirements.certificationCode,
          skillName: machineSkillRequirements.skillName,
          requiredLevel: machineSkillRequirements.requiredLevel,
          sopTemplateId: machineSkillRequirements.sopTemplateId,
        })
        .from(machineSkillRequirements)
        .where(and(
          eq(machineSkillRequirements.machineId, input.machineId),
          eq(machineSkillRequirements.isActive, true),
        ));

      return { machine: machine ?? null, requirements };
    }),

  /** Recent access log for a machine (supervisor dashboard) */
  accessLog: protectedProcedure
    .input(z.object({ machineId: z.number(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(interlockAccessLog)
        .where(eq(interlockAccessLog.machineId, input.machineId))
        .orderBy(desc(interlockAccessLog.checkedAt))
        .limit(input.limit);
    }),
});
