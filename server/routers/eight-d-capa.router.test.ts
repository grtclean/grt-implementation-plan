/**
 * 8D Problem Solving + CAPA Router — Unit Tests
 * Tests 12 procedures: list8D, get8D, create8D, update8DStep, delete8D,
 * listCAPA, getCAPA, createCAPA, updateCAPA, deleteCAPA, suggestCapaFromD5, getStats
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue, returningQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return { selectResultsQueue, returningQueue };
});

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      offset: vi.fn(() => chain),
      set: vi.fn(() => chain),
      values: vi.fn(() => chain),
      returning: vi.fn(() => {
        const r = returningQueue.length > 0 ? returningQueue.shift()! : [{ id: 1 }];
        return Object.assign(Promise.resolve(r), {
          then: (resolve: any) => Promise.resolve(r).then(resolve),
          catch: () => Promise.resolve(r),
        });
      }),
      then(resolve: any) {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() { return chain; },
    };
    const db: any = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      transaction: vi.fn(async (cb: any) => cb(db)),
    };
    return db;
  }),
}));

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAdminCaller();

const sampleReport = {
  id: 1, reportCode: "8D-ABC123", projectId: 10,
  title: "Motor Failure Issue", problemDescription: "Motor overheating at 80°C",
  severity: "high", source: "customer_complaint",
  currentStep: "D3", customerId: 5, customerName: "客户A",
  partNumber: "MOT-001", defectQuantity: 3, dueDate: "2026-03-01",
  teamLeaderId: 2, teamMembers: JSON.stringify(["Alice", "Bob"]),
  d2Description: "Motor overheating", d2IsWhat: "Overheating", d2IsNotWhat: "Short circuit",
  d3ContainmentActions: JSON.stringify(["Replace defective motors"]),
  d3ImplementedAt: "2026-01-15",
  d4RootCauses: JSON.stringify(["Bearing friction", "Insufficient cooling"]),
  d4AnalysisMethod: "fishbone", d4VerificationData: "Thermal tests",
  d5CorrectiveActions: JSON.stringify(["Upgrade bearing", "Add cooling fan"]),
  d6VerificationResult: null, d6EffectivenessData: null, d6ImplementationDate: null,
  d7PreventionActions: JSON.stringify(["Update design spec"]),
  d7SystemChanges: null,
  d8LessonsLearned: null, d8TeamRecognition: null,
  closedAt: null, createdAt: "2026-01-01", updatedAt: "2026-01-10",
};

const sampleCapa = {
  id: 1, capaCode: "CAPA-C-ABC", eightDReportId: 1, projectId: 10,
  capaType: "corrective", title: "Upgrade bearing specification",
  description: "Replace standard bearings with high-temp rated",
  rootCause: "Bearing friction", actionPlan: JSON.stringify(["Spec change", "Vendor qualification"]),
  responsibleId: 2, responsibleName: "Engineer B",
  targetDate: "2026-02-15", completionDate: null,
  verificationMethod: "Thermal test", verificationResult: null,
  effectivenessCheck: null, status: "open", closedAt: null,
  createdAt: "2026-01-10", updatedAt: "2026-01-10",
};

describe("eight-d-capa router", () => {

  // ═══ list8D ═══
  describe("list8D", () => {
    it("returns all reports", async () => {
      selectResultsQueue.push([sampleReport, { ...sampleReport, id: 2, severity: "medium" }]);
      const result = await caller().eightDCapa.list8D();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("filters by projectId", async () => {
      selectResultsQueue.push([sampleReport, { ...sampleReport, id: 2, projectId: 20 }]);
      const result = await caller().eightDCapa.list8D({ projectId: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].projectId).toBe(10);
    });

    it("filters by severity", async () => {
      selectResultsQueue.push([sampleReport, { ...sampleReport, id: 2, severity: "low" }]);
      const result = await caller().eightDCapa.list8D({ severity: "high" });
      expect(result.items).toHaveLength(1);
    });

    it("filters by currentStep", async () => {
      selectResultsQueue.push([sampleReport, { ...sampleReport, id: 2, currentStep: "D5" }]);
      const result = await caller().eightDCapa.list8D({ currentStep: "D3" });
      expect(result.items).toHaveLength(1);
    });

    it("returns empty when no match", async () => {
      selectResultsQueue.push([]);
      const result = await caller().eightDCapa.list8D();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ═══ get8D ═══
  describe("get8D", () => {
    it("returns report with linked CAPAs", async () => {
      selectResultsQueue.push([sampleReport]); // report
      selectResultsQueue.push([sampleCapa]); // capas
      const result = await caller().eightDCapa.get8D({ id: 1 });
      expect(result).toBeTruthy();
      expect(result!.title).toBe("Motor Failure Issue");
      expect(result!.capas).toHaveLength(1);
    });

    it("returns null for missing report", async () => {
      selectResultsQueue.push([]); // not found
      const result = await caller().eightDCapa.get8D({ id: 999 });
      expect(result).toBeNull();
    });

    it("handles string ID", async () => {
      selectResultsQueue.push([sampleReport]);
      selectResultsQueue.push([]);
      const result = await caller().eightDCapa.get8D({ id: "1" });
      expect(result).toBeTruthy();
      expect(result!.capas).toEqual([]);
    });
  });

  // ═══ create8D ═══
  describe("create8D", () => {
    it("creates a report with generated code", async () => {
      returningQueue.push([{ ...sampleReport, id: 5, reportCode: "8D-NEW" }]);
      const result = await caller().eightDCapa.create8D({
        title: "New Issue", severity: "critical", projectId: 10,
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id", 5);
    });

    it("defaults severity to medium", async () => {
      returningQueue.push([{ ...sampleReport, severity: "medium" }]);
      const result = await caller().eightDCapa.create8D({ title: "Minor Issue" });
      expect(result.success).toBe(true);
    });

    it("passes all optional fields", async () => {
      returningQueue.push([{ ...sampleReport, id: 6 }]);
      const result = await caller().eightDCapa.create8D({
        title: "Full Issue", projectId: 10, problemDescription: "Desc",
        severity: "high", source: "audit", customerId: 5, customerName: "C",
        partNumber: "P-001", defectQuantity: 10, dueDate: "2026-04-01",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", async () => {
      await expect(caller().eightDCapa.create8D({ title: "" })).rejects.toThrow();
    });
  });

  // ═══ update8DStep ═══
  describe("update8DStep", () => {
    it("advances step to D4", async () => {
      returningQueue.push([{ ...sampleReport, currentStep: "D4" }]);
      const result = await caller().eightDCapa.update8DStep({
        id: 1, currentStep: "D4",
        d4RootCauses: ["Bearing friction"], d4AnalysisMethod: "5-why",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("currentStep", "D4");
    });

    it("sets d3ImplementedAt on D3 containment actions", async () => {
      returningQueue.push([{ ...sampleReport, currentStep: "D3" }]);
      const result = await caller().eightDCapa.update8DStep({
        id: 1, d3ContainmentActions: ["Replace motors"],
      });
      expect(result.success).toBe(true);
    });

    it("sets closure dates on D8", async () => {
      returningQueue.push([{ ...sampleReport, currentStep: "D8", closedAt: "2026-03-01" }]);
      const result = await caller().eightDCapa.update8DStep({
        id: 1, currentStep: "D8", d8LessonsLearned: "Check bearings early",
      });
      expect(result.success).toBe(true);
    });

    it("sets closure dates on closed", async () => {
      returningQueue.push([{ ...sampleReport, currentStep: "closed" }]);
      const result = await caller().eightDCapa.update8DStep({
        id: 1, currentStep: "closed",
      });
      expect(result.success).toBe(true);
    });

    it("sets d6ImplementationDate on D6", async () => {
      returningQueue.push([{ ...sampleReport, currentStep: "D6" }]);
      const result = await caller().eightDCapa.update8DStep({
        id: 1, currentStep: "D6", d6VerificationResult: "Passed",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid step", async () => {
      await expect(caller().eightDCapa.update8DStep({
        id: 1, currentStep: "D9" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ delete8D ═══
  describe("delete8D", () => {
    it("deletes report and linked CAPAs", async () => {
      selectResultsQueue.push([]); // delete capas
      selectResultsQueue.push([]); // delete report
      const result = await caller().eightDCapa.delete8D({ id: 1 });
      expect(result).toEqual({ success: true, message: "8D报告已删除" });
    });

    it("handles string ID", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      const result = await caller().eightDCapa.delete8D({ id: "1" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ listCAPA ═══
  describe("listCAPA", () => {
    it("returns all CAPAs", async () => {
      selectResultsQueue.push([sampleCapa, { ...sampleCapa, id: 2, capaType: "preventive" }]);
      const result = await caller().eightDCapa.listCAPA();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("filters by capaType", async () => {
      selectResultsQueue.push([sampleCapa, { ...sampleCapa, id: 2, capaType: "preventive" }]);
      const result = await caller().eightDCapa.listCAPA({ capaType: "corrective" });
      expect(result.items).toHaveLength(1);
    });

    it("filters by status", async () => {
      selectResultsQueue.push([sampleCapa, { ...sampleCapa, id: 2, status: "closed" }]);
      const result = await caller().eightDCapa.listCAPA({ status: "open" });
      expect(result.items).toHaveLength(1);
    });

    it("filters by projectId", async () => {
      selectResultsQueue.push([sampleCapa, { ...sampleCapa, id: 2, projectId: 20 }]);
      const result = await caller().eightDCapa.listCAPA({ projectId: 10 });
      expect(result.items).toHaveLength(1);
    });
  });

  // ═══ getCAPA ═══
  describe("getCAPA", () => {
    it("returns CAPA by ID", async () => {
      selectResultsQueue.push([sampleCapa]);
      const result = await caller().eightDCapa.getCAPA({ id: 1 });
      expect(result).toHaveProperty("capaType", "corrective");
    });

    it("returns null for missing CAPA", async () => {
      selectResultsQueue.push([]);
      const result = await caller().eightDCapa.getCAPA({ id: 999 });
      expect(result).toBeNull();
    });
  });

  // ═══ createCAPA ═══
  describe("createCAPA", () => {
    it("creates corrective CAPA", async () => {
      returningQueue.push([{ ...sampleCapa, id: 5 }]);
      const result = await caller().eightDCapa.createCAPA({
        capaType: "corrective", title: "Fix bearing",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id", 5);
    });

    it("creates preventive CAPA with all fields", async () => {
      returningQueue.push([{ ...sampleCapa, id: 6, capaType: "preventive" }]);
      const result = await caller().eightDCapa.createCAPA({
        capaType: "preventive", title: "Update design spec",
        eightDReportId: 1, projectId: 10, description: "Desc",
        rootCause: "RC", actionPlan: ["Step 1", "Step 2"],
        responsibleId: 2, responsibleName: "Bob",
        targetDate: "2026-04-01", verificationMethod: "Test",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", async () => {
      await expect(caller().eightDCapa.createCAPA({
        capaType: "corrective", title: "",
      })).rejects.toThrow();
    });

    it("rejects invalid capaType", async () => {
      await expect(caller().eightDCapa.createCAPA({
        capaType: "invalid" as any, title: "X",
      })).rejects.toThrow();
    });
  });

  // ═══ updateCAPA ═══
  describe("updateCAPA", () => {
    it("updates CAPA fields", async () => {
      returningQueue.push([{ ...sampleCapa, status: "implemented" }]);
      const result = await caller().eightDCapa.updateCAPA({
        id: 1, status: "implemented", verificationResult: "Pass",
      });
      expect(result.success).toBe(true);
    });

    it("sets closedAt when status=closed", async () => {
      returningQueue.push([{ ...sampleCapa, status: "closed", closedAt: "2026-03-01" }]);
      const result = await caller().eightDCapa.updateCAPA({
        id: 1, status: "closed",
      });
      expect(result.success).toBe(true);
    });

    it("serializes actionPlan to JSON", async () => {
      returningQueue.push([{ ...sampleCapa }]);
      const result = await caller().eightDCapa.updateCAPA({
        id: 1, actionPlan: ["New step 1", "New step 2"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", async () => {
      await expect(caller().eightDCapa.updateCAPA({
        id: 1, status: "invalid" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ deleteCAPA ═══
  describe("deleteCAPA", () => {
    it("deletes a CAPA record", async () => {
      selectResultsQueue.push([]); // delete chain
      const result = await caller().eightDCapa.deleteCAPA({ id: 1 });
      expect(result).toEqual({ success: true, message: "CAPA已删除" });
    });
  });

  // ═══ suggestCapaFromD5 ═══
  describe("suggestCapaFromD5", () => {
    it("creates CAPAs from D5 corrective + D7 preventive actions", async () => {
      selectResultsQueue.push([sampleReport]); // report with 2 corrective + 1 preventive
      // 3 inserts (fire-and-forget via chain.then)
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      const result = await caller().eightDCapa.suggestCapaFromD5({ eightDReportId: 1 });
      expect(result.success).toBe(true);
      expect(result.created).toBe(3); // 2 corrective + 1 preventive
    });

    it("returns not found for missing report", async () => {
      selectResultsQueue.push([]); // not found
      const result = await caller().eightDCapa.suggestCapaFromD5({ eightDReportId: 999 });
      expect(result.success).toBe(false);
      expect(result.created).toBe(0);
    });

    it("returns 0 when no actions exist", async () => {
      const emptyReport = {
        ...sampleReport,
        d5CorrectiveActions: JSON.stringify([]),
        d7PreventionActions: JSON.stringify([]),
      };
      selectResultsQueue.push([emptyReport]);
      const result = await caller().eightDCapa.suggestCapaFromD5({ eightDReportId: 1 });
      expect(result.success).toBe(true);
      expect(result.created).toBe(0);
    });

    it("handles malformed JSON in actions", async () => {
      const badReport = {
        ...sampleReport,
        d5CorrectiveActions: "not-json",
        d7PreventionActions: null,
      };
      selectResultsQueue.push([badReport]);
      const result = await caller().eightDCapa.suggestCapaFromD5({ eightDReportId: 1 });
      expect(result.success).toBe(true);
      expect(result.created).toBe(0);
    });

    it("creates only corrective CAPAs when no prevention actions", async () => {
      const reportWithoutD7 = {
        ...sampleReport,
        d7PreventionActions: JSON.stringify([]),
      };
      selectResultsQueue.push([reportWithoutD7]);
      selectResultsQueue.push([]); // insert 1
      selectResultsQueue.push([]); // insert 2
      const result = await caller().eightDCapa.suggestCapaFromD5({ eightDReportId: 1 });
      expect(result.created).toBe(2); // only 2 corrective
    });
  });

  // ═══ getStats ═══
  describe("getStats", () => {
    it("returns aggregated 8D and CAPA stats", async () => {
      selectResultsQueue.push([
        { ...sampleReport, severity: "critical", currentStep: "D3" },
        { ...sampleReport, id: 2, severity: "high", currentStep: "closed" },
        { ...sampleReport, id: 3, severity: "medium", currentStep: "verified" },
      ]); // reports
      selectResultsQueue.push([
        { ...sampleCapa, capaType: "corrective", status: "open" },
        { ...sampleCapa, id: 2, capaType: "preventive", status: "closed" },
      ]); // capas
      const result = await caller().eightDCapa.getStats();
      expect(result.eightD.total).toBe(3);
      expect(result.eightD.open).toBe(1); // D3
      expect(result.eightD.closed).toBe(2); // closed + verified
      expect(result.eightD.bySeverity.critical).toBe(1);
      expect(result.eightD.bySeverity.high).toBe(1);
      expect(result.eightD.bySeverity.medium).toBe(1);
      expect(result.capa.total).toBe(2);
      expect(result.capa.open).toBe(1);
      expect(result.capa.closed).toBe(1);
      expect(result.capa.corrective).toBe(1);
      expect(result.capa.preventive).toBe(1);
    });

    it("filters by projectId", async () => {
      selectResultsQueue.push([
        { ...sampleReport, projectId: 10 },
        { ...sampleReport, id: 2, projectId: 20 },
      ]);
      selectResultsQueue.push([
        { ...sampleCapa, projectId: 10 },
      ]);
      const result = await caller().eightDCapa.getStats({ projectId: 10 });
      expect(result.eightD.total).toBe(1);
      expect(result.capa.total).toBe(1);
    });

    it("returns zeros when no data", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      const result = await caller().eightDCapa.getStats();
      expect(result.eightD.total).toBe(0);
      expect(result.capa.total).toBe(0);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list8D", async () => {
      await expect(createAnonymousCaller().eightDCapa.list8D()).rejects.toThrow();
    });
    it("rejects anonymous for get8D", async () => {
      await expect(createAnonymousCaller().eightDCapa.get8D({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for create8D", async () => {
      await expect(createAnonymousCaller().eightDCapa.create8D({ title: "X" })).rejects.toThrow();
    });
    it("rejects anonymous for update8DStep", async () => {
      await expect(createAnonymousCaller().eightDCapa.update8DStep({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for delete8D", async () => {
      await expect(createAnonymousCaller().eightDCapa.delete8D({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for listCAPA", async () => {
      await expect(createAnonymousCaller().eightDCapa.listCAPA()).rejects.toThrow();
    });
    it("rejects anonymous for getCAPA", async () => {
      await expect(createAnonymousCaller().eightDCapa.getCAPA({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for createCAPA", async () => {
      await expect(createAnonymousCaller().eightDCapa.createCAPA({
        capaType: "corrective", title: "X",
      })).rejects.toThrow();
    });
    it("rejects anonymous for updateCAPA", async () => {
      await expect(createAnonymousCaller().eightDCapa.updateCAPA({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for deleteCAPA", async () => {
      await expect(createAnonymousCaller().eightDCapa.deleteCAPA({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for suggestCapaFromD5", async () => {
      await expect(createAnonymousCaller().eightDCapa.suggestCapaFromD5({ eightDReportId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for getStats", async () => {
      await expect(createAnonymousCaller().eightDCapa.getStats()).rejects.toThrow();
    });
  });
});
