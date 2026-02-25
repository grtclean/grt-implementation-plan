/**
 * Compliance Calendar Warning Engine — Automated Test Suite
 * Phase 1.4 — IATF 16949 / ISO Certification Expiry Management
 *
 * These tests verify the mathematical correctness and tier-classification
 * logic of the compliance warning engine.
 *
 * Tier thresholds:
 *   SAFE      ≥90 days to expiry   (Green)
 *   WARNING   60–89 days           (Yellow)
 *   CRITICAL  30–59 days           (Orange)
 *   DANGER    <30 days / expired   (Red)
 *
 * Run: pnpm test -- server/routers/compliance-calendar.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  daysUntilExpiry,
  classifyTier,
  evaluateCompliance,
  type CertificationInput,
  type ComplianceTier,
} from "./compliance-calendar.router";

// ─── Helpers ────────────────────────────────────────────────────────

/** Create a date string N days from `base` */
function addDays(base: Date, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Build a simple cert input for testing */
function makeCert(
  overrides: Partial<CertificationInput> & { expiryDate: string },
): CertificationInput {
  return {
    id: 1,
    certName: "Test Cert",
    category: "ISO",
    ownerId: 100,
    ownerName: "Test Owner",
    status: "valid",
    ...overrides,
  };
}

// ─── daysUntilExpiry ─────────────────────────────────────────────────

describe("daysUntilExpiry — date math", () => {
  const now = new Date("2026-03-01T12:00:00Z");

  it("should return positive days for future expiry", () => {
    expect(daysUntilExpiry("2026-06-01", now)).toBe(92);
  });

  it("should return 0 for same-day expiry", () => {
    expect(daysUntilExpiry("2026-03-01", now)).toBe(0);
  });

  it("should return negative days for past expiry", () => {
    expect(daysUntilExpiry("2026-02-01", now)).toBe(-28);
  });

  it("should handle year boundaries", () => {
    const dec31 = new Date("2025-12-31T00:00:00Z");
    expect(daysUntilExpiry("2026-01-01", dec31)).toBe(1);
  });

  it("should handle leap year (2028-02-29)", () => {
    const feb28 = new Date("2028-02-28T00:00:00Z");
    expect(daysUntilExpiry("2028-02-29", feb28)).toBe(1);
  });
});

// ─── classifyTier ────────────────────────────────────────────────────

describe("classifyTier — tier classification", () => {
  it("should classify ≥90 days as SAFE", () => {
    expect(classifyTier(90)).toBe("SAFE");
    expect(classifyTier(365)).toBe("SAFE");
    expect(classifyTier(91)).toBe("SAFE");
  });

  it("should classify 60–89 days as WARNING", () => {
    expect(classifyTier(89)).toBe("WARNING");
    expect(classifyTier(60)).toBe("WARNING");
    expect(classifyTier(75)).toBe("WARNING");
  });

  it("should classify 30–59 days as CRITICAL", () => {
    expect(classifyTier(59)).toBe("CRITICAL");
    expect(classifyTier(30)).toBe("CRITICAL");
    expect(classifyTier(45)).toBe("CRITICAL");
  });

  it("should classify <30 days as DANGER", () => {
    expect(classifyTier(29)).toBe("DANGER");
    expect(classifyTier(0)).toBe("DANGER");
    expect(classifyTier(1)).toBe("DANGER");
  });

  it("should classify negative days (expired) as DANGER", () => {
    expect(classifyTier(-1)).toBe("DANGER");
    expect(classifyTier(-30)).toBe("DANGER");
    expect(classifyTier(-365)).toBe("DANGER");
  });

  // Boundary tests — exact thresholds
  it("should handle exact boundary at 90 days (SAFE, not WARNING)", () => {
    expect(classifyTier(90)).toBe("SAFE");
  });

  it("should handle exact boundary at 60 days (WARNING, not CRITICAL)", () => {
    expect(classifyTier(60)).toBe("WARNING");
  });

  it("should handle exact boundary at 30 days (CRITICAL, not DANGER)", () => {
    expect(classifyTier(30)).toBe("CRITICAL");
  });
});

// ─── evaluateCompliance — full pipeline ──────────────────────────────

describe("evaluateCompliance — summary generation", () => {
  const now = new Date("2026-03-01T00:00:00Z");

  it("should process an empty array and return zero counts", () => {
    const result = evaluateCompliance([], now);

    expect(result.total).toBe(0);
    expect(result.safe).toBe(0);
    expect(result.warning).toBe(0);
    expect(result.critical).toBe(0);
    expect(result.danger).toBe(0);
    expect(result.expired).toBe(0);
    expect(result.alerts).toHaveLength(0);
  });

  it("should correctly classify a single SAFE certification", () => {
    const certs: CertificationInput[] = [
      makeCert({ expiryDate: addDays(now, 120) }),
    ];
    const result = evaluateCompliance(certs, now);

    expect(result.total).toBe(1);
    expect(result.safe).toBe(1);
    expect(result.alerts[0].tier).toBe("SAFE");
    expect(result.alerts[0].daysRemaining).toBe(120);
  });

  it("should correctly classify a WARNING certification (85 days)", () => {
    const certs: CertificationInput[] = [
      makeCert({ id: 2, certName: "ISO 14001", expiryDate: addDays(now, 85) }),
    ];
    const result = evaluateCompliance(certs, now);

    expect(result.warning).toBe(1);
    expect(result.alerts[0].tier).toBe("WARNING");
    expect(result.alerts[0].daysRemaining).toBe(85);
  });

  it("should correctly classify a CRITICAL certification (45 days)", () => {
    const certs: CertificationInput[] = [
      makeCert({ id: 3, certName: "IATF 16949", expiryDate: addDays(now, 45) }),
    ];
    const result = evaluateCompliance(certs, now);

    expect(result.critical).toBe(1);
    expect(result.alerts[0].tier).toBe("CRITICAL");
  });

  it("should correctly classify a DANGER certification (15 days)", () => {
    const certs: CertificationInput[] = [
      makeCert({ id: 4, certName: "Bosch Audit", expiryDate: addDays(now, 15), category: "CUSTOMER_AUDIT" }),
    ];
    const result = evaluateCompliance(certs, now);

    expect(result.danger).toBe(1);
    expect(result.alerts[0].tier).toBe("DANGER");
    expect(result.alerts[0].category).toBe("CUSTOMER_AUDIT");
  });

  it("should force expired status to DANGER regardless of days", () => {
    // A cert with status='expired' even if expiryDate is in the future
    const certs: CertificationInput[] = [
      makeCert({ id: 5, expiryDate: addDays(now, 200), status: "expired" }),
    ];
    const result = evaluateCompliance(certs, now);

    expect(result.danger).toBe(1);
    expect(result.expired).toBe(1);
    expect(result.alerts[0].tier).toBe("DANGER");
  });

  it("should count mixed tiers correctly", () => {
    const certs: CertificationInput[] = [
      makeCert({ id: 1, certName: "ISO 9001", expiryDate: addDays(now, 200) }),  // SAFE
      makeCert({ id: 2, certName: "ISO 14001", expiryDate: addDays(now, 75) }),  // WARNING
      makeCert({ id: 3, certName: "CE Mark", expiryDate: addDays(now, 40) }),    // CRITICAL
      makeCert({ id: 4, certName: "BMW VDA", expiryDate: addDays(now, 10) }),    // DANGER
      makeCert({ id: 5, certName: "Fire Safety", expiryDate: addDays(now, -5), status: "expired" }),  // DANGER+expired
    ];
    const result = evaluateCompliance(certs, now);

    expect(result.total).toBe(5);
    expect(result.safe).toBe(1);
    expect(result.warning).toBe(1);
    expect(result.critical).toBe(1);
    expect(result.danger).toBe(2);
    expect(result.expired).toBe(1);
  });

  it("should sort alerts by urgency (DANGER first, SAFE last)", () => {
    const certs: CertificationInput[] = [
      makeCert({ id: 1, certName: "SAFE cert", expiryDate: addDays(now, 200) }),
      makeCert({ id: 2, certName: "DANGER cert", expiryDate: addDays(now, 5) }),
      makeCert({ id: 3, certName: "WARNING cert", expiryDate: addDays(now, 70) }),
      makeCert({ id: 4, certName: "CRITICAL cert", expiryDate: addDays(now, 35) }),
    ];
    const result = evaluateCompliance(certs, now);

    expect(result.alerts[0].tier).toBe("DANGER");
    expect(result.alerts[1].tier).toBe("CRITICAL");
    expect(result.alerts[2].tier).toBe("WARNING");
    expect(result.alerts[3].tier).toBe("SAFE");
  });

  it("should sort same-tier alerts by days remaining (fewer days first)", () => {
    const certs: CertificationInput[] = [
      makeCert({ id: 1, certName: "Later DANGER", expiryDate: addDays(now, 20) }),
      makeCert({ id: 2, certName: "Urgent DANGER", expiryDate: addDays(now, 5) }),
      makeCert({ id: 3, certName: "Mid DANGER", expiryDate: addDays(now, 12) }),
    ];
    const result = evaluateCompliance(certs, now);

    expect(result.alerts[0].certName).toBe("Urgent DANGER");
    expect(result.alerts[1].certName).toBe("Mid DANGER");
    expect(result.alerts[2].certName).toBe("Later DANGER");
  });

  it("should preserve category information", () => {
    const certs: CertificationInput[] = [
      makeCert({ id: 1, category: "ISO", expiryDate: addDays(now, 100) }),
      makeCert({ id: 2, category: "CE", expiryDate: addDays(now, 50) }),
      makeCert({ id: 3, category: "CUSTOMER_AUDIT", expiryDate: addDays(now, 20) }),
      makeCert({ id: 4, category: "SAFETY", expiryDate: addDays(now, 150) }),
    ];
    const result = evaluateCompliance(certs, now);

    const categories = result.alerts.map((a) => a.category);
    expect(categories).toContain("ISO");
    expect(categories).toContain("CE");
    expect(categories).toContain("CUSTOMER_AUDIT");
    expect(categories).toContain("SAFETY");
  });

  it("should mark all alerts as not acknowledged initially", () => {
    const certs: CertificationInput[] = [
      makeCert({ id: 1, expiryDate: addDays(now, 100) }),
      makeCert({ id: 2, expiryDate: addDays(now, 10) }),
    ];
    const result = evaluateCompliance(certs, now);

    result.alerts.forEach((alert) => {
      expect(alert.isAcknowledged).toBe(false);
    });
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────

describe("Compliance Engine — Edge Cases", () => {
  it("should handle a cert expiring today (day 0) as DANGER", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    const certs: CertificationInput[] = [
      makeCert({ expiryDate: "2026-06-15" }),
    ];
    const result = evaluateCompliance(certs, now);

    expect(result.alerts[0].daysRemaining).toBe(0);
    expect(result.alerts[0].tier).toBe("DANGER");
  });

  it("should handle a cert expiring tomorrow (day 1) as DANGER", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    const certs: CertificationInput[] = [
      makeCert({ expiryDate: "2026-06-16" }),
    ];
    const result = evaluateCompliance(certs, now);

    expect(result.alerts[0].daysRemaining).toBe(1);
    expect(result.alerts[0].tier).toBe("DANGER");
  });

  it("should handle suspended status (not expired) using date-based tier", () => {
    const now = new Date("2026-03-01T00:00:00Z");
    const certs: CertificationInput[] = [
      makeCert({ expiryDate: addDays(now, 120), status: "suspended" }),
    ];
    const result = evaluateCompliance(certs, now);

    // Suspended but 120 days out → SAFE (status isn't "expired")
    expect(result.alerts[0].tier).toBe("SAFE");
    expect(result.expired).toBe(0);
  });

  it("should handle a large number of certifications efficiently", () => {
    const now = new Date("2026-03-01T00:00:00Z");
    const certs: CertificationInput[] = Array.from({ length: 500 }, (_, i) =>
      makeCert({ id: i + 1, certName: `Cert-${i}`, expiryDate: addDays(now, i) }),
    );
    const result = evaluateCompliance(certs, now);

    expect(result.total).toBe(500);
    expect(result.danger + result.critical + result.warning + result.safe).toBe(500);
    // First alert should be the most urgent (day 0)
    expect(result.alerts[0].daysRemaining).toBe(0);
  });
});
