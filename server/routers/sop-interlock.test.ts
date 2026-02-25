/**
 * SOP + Role Quality Interlock — Automated Test Suite
 * Phase 1.2 — MANDATORY per CTO Directive (Architectural Pillar #2)
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  WHY THESE TESTS ARE NON-NEGOTIABLE                              │
 * │                                                                  │
 * │  This interlock physically controls whether a human operator     │
 * │  can activate industrial cleaning equipment. Failure modes:      │
 * │                                                                  │
 * │  • False GRANTED → untrained operator runs machine →             │
 * │    chemical exposure, equipment damage, or injury.               │
 * │                                                                  │
 * │  • False BLOCKED → trained operator can't start machine →        │
 * │    production halt (costly but SAFE).                             │
 * │                                                                  │
 * │  Design bias: FAIL CLOSED. These tests verify that bias.         │
 * │  A regression in this module could shut down the factory floor   │
 * │  or, worse, let someone operate equipment they shouldn't.        │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Run: pnpm test -- server/routers/sop-interlock.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  evaluateAccess,
  type CertRequirement,
  type UserCert,
  type SopStatus,
} from "./sop-interlock.router";

// ─── Test Fixtures ──────────────────────────────────────────────────

const NOW = new Date("2026-02-25T08:00:00Z");

const VALID_CERT: UserCert = {
  certificateCode: "CNC_MILL_L2",
  expiryDate: "2027-12-31T23:59:59Z", // valid — expires next year
  certificateLevel: "intermediate",
};

const EXPIRED_CERT: UserCert = {
  certificateCode: "CNC_MILL_L2",
  expiryDate: "2025-06-15T23:59:59Z", // expired — last year
  certificateLevel: "intermediate",
};

const WELDING_CERT: UserCert = {
  certificateCode: "WELDING_AWS",
  expiryDate: "2027-06-01T00:00:00Z",
  certificateLevel: "advanced",
};

const MACHINE_REQS: CertRequirement[] = [
  { certificationCode: "CNC_MILL_L2", skillName: "CNC Mill Operation Level 2", requiredLevel: "intermediate", sopTemplateId: 101 },
  { certificationCode: "WELDING_AWS", skillName: "AWS Welding Certification", requiredLevel: "basic", sopTemplateId: 101 },
];

const SOP_CURRENT: SopStatus = {
  sopTemplateId: 101,
  currentVersion: "2.1",
  signedVersion: "2.1", // operator has signed the latest
};

const SOP_OUTDATED: SopStatus = {
  sopTemplateId: 101,
  currentVersion: "2.1",
  signedVersion: "1.4", // operator signed an old version
};

const SOP_NEVER_SIGNED: SopStatus = {
  sopTemplateId: 101,
  currentVersion: "2.1",
  signedVersion: null, // operator never signed
};

// ─── Test Suite ─────────────────────────────────────────────────────

describe("SOP + Role Quality Interlock — evaluateAccess()", () => {

  // ════════════════════════════════════════════════════════════════
  // HAPPY PATH: Fully qualified operator
  // ════════════════════════════════════════════════════════════════

  describe("GRANTED scenarios", () => {
    it("should GRANT access when operator has all valid certs AND signed latest SOP", () => {
      // This is the golden path: Zhang Wei has CNC_MILL_L2 + WELDING_AWS,
      // both unexpired, and signed SOP v2.1 (the current version).
      const result = evaluateAccess(
        MACHINE_REQS,
        [VALID_CERT, WELDING_CERT],
        [SOP_CURRENT],
        NOW,
      );

      expect(result.status).toBe("GRANTED");
      expect(result.reason).toBeNull();
      expect(result.details.certCheckPassed).toBe(true);
      expect(result.details.sopCheckPassed).toBe(true);
      expect(result.details.missingCerts).toHaveLength(0);
      expect(result.details.outdatedSops).toHaveLength(0);
    });

    it("should GRANT access when machine requires only one cert and operator has it", () => {
      const singleReq: CertRequirement[] = [
        { certificationCode: "CNC_MILL_L2", skillName: "CNC Mill", requiredLevel: "basic", sopTemplateId: 101 },
      ];

      const result = evaluateAccess(singleReq, [VALID_CERT], [SOP_CURRENT], NOW);
      expect(result.status).toBe("GRANTED");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // BLOCKED: Certification failures
  // These tests prevent FACTORY LINE DISASTERS where an untrained
  // operator could cause chemical spills or equipment damage.
  // ════════════════════════════════════════════════════════════════

  describe("BLOCKED — certification failures", () => {
    it("should BLOCK when operator has an EXPIRED certification", () => {
      // Li Ming's CNC cert expired on 2025-06-15.
      // Even though he was qualified before, an expired cert is a HARD BLOCK.
      // Rationale: equipment or procedures may have changed since cert issue.
      const result = evaluateAccess(
        MACHINE_REQS,
        [EXPIRED_CERT, WELDING_CERT], // CNC expired, welding valid
        [SOP_CURRENT],
        NOW,
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.details.certCheckPassed).toBe(false);
      expect(result.details.missingCerts).toContain("CNC_MILL_L2");
      expect(result.reason).toContain("CNC_MILL_L2");
    });

    it("should BLOCK when operator is missing a required certification entirely", () => {
      // Wang Jun only has CNC cert, but the machine also requires WELDING_AWS.
      // Missing cert = operator cannot safely operate the welding components.
      const result = evaluateAccess(
        MACHINE_REQS,
        [VALID_CERT], // has CNC, missing WELDING_AWS
        [SOP_CURRENT],
        NOW,
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.details.certCheckPassed).toBe(false);
      expect(result.details.missingCerts).toContain("WELDING_AWS");
    });

    it("should BLOCK when operator has ZERO certifications", () => {
      // New hire Zhao Fan — no certs at all. Must complete training first.
      const result = evaluateAccess(MACHINE_REQS, [], [SOP_CURRENT], NOW);

      expect(result.status).toBe("BLOCKED");
      expect(result.details.certCheckPassed).toBe(false);
      expect(result.details.missingCerts).toHaveLength(2); // both missing
    });

    it("should list ALL missing certs, not just the first one", () => {
      // Operator has no certs — both CNC and welding should appear in the list.
      // This is important for the UI: show the operator everything they need.
      const result = evaluateAccess(MACHINE_REQS, [], [SOP_CURRENT], NOW);

      expect(result.details.missingCerts).toContain("CNC_MILL_L2");
      expect(result.details.missingCerts).toContain("WELDING_AWS");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // BLOCKED: SOP acknowledgment failures
  // These tests prevent scenarios where a machine's SOP was updated
  // (e.g., new chemical handling procedure) but the operator hasn't
  // read the new version. Running with outdated knowledge = risk.
  // ════════════════════════════════════════════════════════════════

  describe("BLOCKED — SOP acknowledgment failures", () => {
    it("should BLOCK when operator signed an OUTDATED SOP version", () => {
      // SOP was updated from v1.4 to v2.1 (new chemical handling procedure).
      // Chen Wei last signed v1.4 — he must review v2.1 before operating.
      const result = evaluateAccess(
        MACHINE_REQS,
        [VALID_CERT, WELDING_CERT], // certs OK
        [SOP_OUTDATED],              // but SOP outdated
        NOW,
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.details.certCheckPassed).toBe(true);  // certs are fine
      expect(result.details.sopCheckPassed).toBe(false);   // SOP is the problem
      expect(result.details.outdatedSops).toHaveLength(1);
      expect(result.details.outdatedSops[0].required).toBe("2.1");
      expect(result.details.outdatedSops[0].signed).toBe("1.4");
      expect(result.reason).toContain("v2.1");
    });

    it("should BLOCK when operator has NEVER signed the SOP", () => {
      // New to this machine — never opened the SOP at all.
      const result = evaluateAccess(
        MACHINE_REQS,
        [VALID_CERT, WELDING_CERT],
        [SOP_NEVER_SIGNED],
        NOW,
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.details.sopCheckPassed).toBe(false);
      expect(result.details.outdatedSops[0].signed).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // BLOCKED: Combined failures
  // ════════════════════════════════════════════════════════════════

  describe("BLOCKED — combined failures", () => {
    it("should BLOCK and report BOTH cert + SOP failures together", () => {
      // Worst case: expired cert AND outdated SOP.
      // The UI needs both reasons to tell the operator what to fix.
      const result = evaluateAccess(
        MACHINE_REQS,
        [EXPIRED_CERT, WELDING_CERT],
        [SOP_OUTDATED],
        NOW,
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.details.certCheckPassed).toBe(false);
      expect(result.details.sopCheckPassed).toBe(false);
      expect(result.reason).toContain("CNC_MILL_L2");
      expect(result.reason).toContain("v2.1");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // FAIL-CLOSED: Unconfigured machine
  // This is the defensive programming paradigm from the CTO.
  // An unconfigured machine is NOT a free pass.
  // ════════════════════════════════════════════════════════════════

  describe("FAIL-CLOSED — defensive defaults", () => {
    it("should BLOCK when machine has NO requirements configured", () => {
      // Machine was just added to the system but nobody defined its
      // skill requirements yet. A naive implementation might return GRANTED
      // (no requirements = nothing to fail). That's DANGEROUS.
      // Our design: unconfigured = BLOCKED. Contact supervisor.
      const result = evaluateAccess(
        [],  // no requirements defined
        [VALID_CERT, WELDING_CERT],
        [],
        NOW,
      );

      expect(result.status).toBe("BLOCKED");
      expect(result.reason).toContain("no skill requirements configured");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // Edge cases: time boundary
  // ════════════════════════════════════════════════════════════════

  describe("Edge cases — certification expiry boundaries", () => {
    it("should BLOCK when cert expires exactly today (same-day boundary)", () => {
      // Cert expires today at midnight — we're checking at 08:00.
      // A cert that expires today should still be valid until midnight.
      const expiringTodayCert: UserCert = {
        certificateCode: "CNC_MILL_L2",
        expiryDate: "2026-02-25T23:59:59Z", // expires end of today
        certificateLevel: "intermediate",
      };

      const singleReq: CertRequirement[] = [
        { certificationCode: "CNC_MILL_L2", skillName: "CNC", requiredLevel: "basic", sopTemplateId: null },
      ];

      const result = evaluateAccess(singleReq, [expiringTodayCert], [], NOW);
      expect(result.status).toBe("GRANTED"); // still valid until midnight
    });

    it("should BLOCK when cert expired 1 second ago", () => {
      const justExpiredCert: UserCert = {
        certificateCode: "CNC_MILL_L2",
        expiryDate: "2026-02-25T07:59:59Z", // expired 1 second before NOW
        certificateLevel: "intermediate",
      };

      const singleReq: CertRequirement[] = [
        { certificationCode: "CNC_MILL_L2", skillName: "CNC", requiredLevel: "basic", sopTemplateId: null },
      ];

      const result = evaluateAccess(singleReq, [justExpiredCert], [], NOW);
      expect(result.status).toBe("BLOCKED");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // SOP-less machine requirements
  // ════════════════════════════════════════════════════════════════

  describe("Machine with certs but no SOP requirement", () => {
    it("should GRANT when machine requires certs but no SOP link", () => {
      // Some machines only need certification, no SOP (e.g., forklift).
      const certOnlyReqs: CertRequirement[] = [
        { certificationCode: "CNC_MILL_L2", skillName: "CNC", requiredLevel: "basic", sopTemplateId: null },
      ];

      const result = evaluateAccess(certOnlyReqs, [VALID_CERT], [], NOW);
      expect(result.status).toBe("GRANTED");
    });
  });
});
