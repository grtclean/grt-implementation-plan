/**
 * Compliance Calendar & Auto-Reminder — Warning Engine + tRPC Router
 * Phase 1.4 — IATF 16949 / ISO certification expiry management
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Tier      │ Days Remaining │ Color  │ Action Required          │
 * │────────────┼────────────────┼────────┼──────────────────────────│
 * │  SAFE      │  ≥90           │ Green  │ None — on track          │
 * │  WARNING   │  60–89         │ Yellow │ Begin renewal process    │
 * │  CRITICAL  │  30–59         │ Orange │ Escalate to management   │
 * │  DANGER    │  <30 / expired │ Red    │ Immediate action needed  │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Architecture: Pure tier-classification function exported for Vitest.
 * Router provides mock-first data (Phase 0 pattern).
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";

// ─── Types ───────────────────────────────────────────────────────────

export type ComplianceTier = "SAFE" | "WARNING" | "CRITICAL" | "DANGER";

export type ComplianceCategory = "ISO" | "CE" | "CUSTOMER_AUDIT" | "SAFETY";

export interface CertificationInput {
  id: number;
  certName: string;
  category: ComplianceCategory;
  expiryDate: string;   // ISO date string: "2026-05-15"
  ownerId: number;
  ownerName: string;
  status: "valid" | "expired" | "pending" | "suspended";
}

export interface ComplianceAlert {
  id: number;
  certName: string;
  category: ComplianceCategory;
  expiryDate: string;
  daysRemaining: number;
  tier: ComplianceTier;
  ownerId: number;
  ownerName: string;
  status: "valid" | "expired" | "pending" | "suspended";
  isAcknowledged: boolean;
}

export interface ComplianceSummary {
  total: number;
  safe: number;
  warning: number;
  critical: number;
  danger: number;
  expired: number;
  alerts: ComplianceAlert[];
}

// ─── Pure Calculation Engine (fully unit-testable) ───────────────────

/**
 * Calculate the number of days remaining until expiry.
 * Returns negative values for already-expired certifications.
 */
export function daysUntilExpiry(expiryDate: string, now: Date = new Date()): number {
  const expiry = new Date(expiryDate + "T00:00:00Z");
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const diffMs = expiry.getTime() - today.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Classify a certification into a compliance tier based on days remaining.
 *
 * Tier thresholds (per CEO directive):
 *   SAFE     ≥90 days
 *   WARNING  60–89 days
 *   CRITICAL 30–59 days
 *   DANGER   <30 days (includes expired / negative)
 */
export function classifyTier(daysRemaining: number): ComplianceTier {
  if (daysRemaining >= 90) return "SAFE";
  if (daysRemaining >= 60) return "WARNING";
  if (daysRemaining >= 30) return "CRITICAL";
  return "DANGER";
}

/**
 * Process a batch of certifications and generate a compliance summary.
 * Pure function — no DB access, fully deterministic given `now`.
 */
export function evaluateCompliance(
  certs: CertificationInput[],
  now: Date = new Date(),
): ComplianceSummary {
  const alerts: ComplianceAlert[] = certs.map((cert) => {
    const days = daysUntilExpiry(cert.expiryDate, now);
    return {
      id: cert.id,
      certName: cert.certName,
      category: cert.category,
      expiryDate: cert.expiryDate,
      daysRemaining: days,
      tier: cert.status === "expired" ? "DANGER" : classifyTier(days),
      ownerId: cert.ownerId,
      ownerName: cert.ownerName,
      status: cert.status,
      isAcknowledged: false,
    };
  });

  // Sort by urgency: DANGER first, then CRITICAL, WARNING, SAFE
  const tierOrder: Record<ComplianceTier, number> = {
    DANGER: 0,
    CRITICAL: 1,
    WARNING: 2,
    SAFE: 3,
  };
  alerts.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier] || a.daysRemaining - b.daysRemaining);

  return {
    total: alerts.length,
    safe: alerts.filter((a) => a.tier === "SAFE").length,
    warning: alerts.filter((a) => a.tier === "WARNING").length,
    critical: alerts.filter((a) => a.tier === "CRITICAL").length,
    danger: alerts.filter((a) => a.tier === "DANGER").length,
    expired: alerts.filter((a) => a.status === "expired").length,
    alerts,
  };
}

// ─── Mock Data (CEO demo — Phase 0 pattern) ─────────────────────────

function buildMockCerts(now: Date): CertificationInput[] {
  const addDays = (d: Date, n: number): string => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r.toISOString().slice(0, 10);
  };

  return [
    // SAFE — comfortably ahead
    {
      id: 1,
      certName: "ISO 9001:2015 QMS",
      category: "ISO",
      expiryDate: addDays(now, 240),
      ownerId: 101,
      ownerName: "Zhang Wei (质量部)",
      status: "valid",
    },
    {
      id: 2,
      certName: "ISO 14001 Environmental",
      category: "ISO",
      expiryDate: addDays(now, 85),
      ownerId: 102,
      ownerName: "Li Ming (环境部)",
      status: "valid",
    },
    // WARNING — renewal window open
    {
      id: 3,
      certName: "CE Marking — Machinery Directive",
      category: "CE",
      expiryDate: addDays(now, 72),
      ownerId: 103,
      ownerName: "Wang Jun (工程部)",
      status: "valid",
    },
    // CRITICAL — escalation needed
    {
      id: 4,
      certName: "BMW Supplier Audit (VDA 6.3)",
      category: "CUSTOMER_AUDIT",
      expiryDate: addDays(now, 28),
      ownerId: 104,
      ownerName: "Chen Li (销售部)",
      status: "valid",
    },
    {
      id: 5,
      certName: "IATF 16949:2016 Automotive QMS",
      category: "ISO",
      expiryDate: addDays(now, 45),
      ownerId: 101,
      ownerName: "Zhang Wei (质量部)",
      status: "valid",
    },
    // DANGER — immediate action
    {
      id: 6,
      certName: "Bosch First Article Inspection",
      category: "CUSTOMER_AUDIT",
      expiryDate: addDays(now, 12),
      ownerId: 105,
      ownerName: "Zhao Peng (项目部)",
      status: "valid",
    },
    // Already expired
    {
      id: 7,
      certName: "Fire Safety Certificate",
      category: "SAFETY",
      expiryDate: addDays(now, -15),
      ownerId: 106,
      ownerName: "Liu Fang (行政部)",
      status: "expired",
    },
    // SAFE
    {
      id: 8,
      certName: "UL Certification (Electrical Safety)",
      category: "SAFETY",
      expiryDate: addDays(now, 180),
      ownerId: 103,
      ownerName: "Wang Jun (工程部)",
      status: "valid",
    },
    // WARNING
    {
      id: 9,
      certName: "Volkswagen Group Q-Capability",
      category: "CUSTOMER_AUDIT",
      expiryDate: addDays(now, 63),
      ownerId: 104,
      ownerName: "Chen Li (销售部)",
      status: "valid",
    },
    // CRITICAL
    {
      id: 10,
      certName: "CE Marking — Low Voltage Directive",
      category: "CE",
      expiryDate: addDays(now, 38),
      ownerId: 103,
      ownerName: "Wang Jun (工程部)",
      status: "valid",
    },
  ];
}

// ─── tRPC Router ─────────────────────────────────────────────────────

export const complianceCalendarRouter = router({
  /**
   * dashboard — returns full compliance summary with tiered alerts.
   * Mock-first: returns demo data, overlays live DB when available.
   */
  dashboard: protectedProcedure.query(async () => {
    const now = new Date();
    const mockCerts = buildMockCerts(now);

    // Phase 4: overlay live data from certifications table
    // const db = await requireDb();
    // const liveCerts = await db.select().from(certifications).where(...)

    const summary = evaluateCompliance(mockCerts, now);

    return {
      ...summary,
      generatedAt: now.toISOString(),
      dataSource: "mock" as const,
    };
  }),

  /**
   * acknowledge — mark a compliance alert as acknowledged.
   * Writes to audit trail (Phase 4: real DB).
   */
  acknowledge: requirePermission('system:compliance:manage')
    .input(z.object({
      alertId: z.number(),
      action: z.enum(["ACKNOWLEDGED", "DELEGATED", "RENEWED", "DISMISSED"]),
      delegatedTo: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Phase 4: write to complianceReminderActions table
      // const db = await requireDb();
      // await db.insert(complianceReminderActions).values({ ... });

      return {
        success: true,
        alertId: input.alertId,
        action: input.action,
        performedBy: (ctx as any).user?.id ?? 0,
        timestamp: new Date().toISOString(),
      };
    }),

  /**
   * history — returns recent compliance actions for audit trail.
   * Mock-first: returns demo action history.
   */
  history: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      // Phase 4: read from complianceReminderActions table
      return {
        actions: [
          {
            id: 1,
            certName: "ISO 9001:2015 QMS",
            action: "ACKNOWLEDGED" as const,
            performedByName: "Zhang Wei",
            notes: "Renewal process initiated with TÜV SÜD",
            performedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
          {
            id: 2,
            certName: "BMW Supplier Audit (VDA 6.3)",
            action: "DELEGATED" as const,
            performedByName: "Chen Li",
            delegatedToName: "Zhang Wei",
            notes: "Quality dept to prepare documentation package",
            performedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          },
        ],
        total: 2,
        dataSource: "mock" as const,
      };
    }),
});
