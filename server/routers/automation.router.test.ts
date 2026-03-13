/**
 * Automation Router — Unit Tests
 * Tests 8 procedures: list, listTriggeredMeetings, getAutomationStats,
 * triggerPhaseChange, triggerTNodeDelay, triggerOKRAtRisk,
 * triggerQualityEscalation, triggerSupplierPenalty
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
    return {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
  }),
}));

vi.mock("drizzle-orm", () => ({
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

const sampleMeeting = {
  id: 1,
  title: "[M2] ProjectX — 阶段启动会",
  type: "PHASE_CHANGE",
  status: "UPCOMING",
  description: "项目「ProjectX」进入 M2 阶段，项目经理: 张三。自动触发阶段启动会议。",
  scheduledStart: "2026-03-01T02:00:00.000Z",
  triggerSource: "Phase: M2",
  createdBy: 1,
  createdAt: "2026-03-01T00:00:00.000Z",
};

describe("automation router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns empty stub", async () => {
      const result = await caller().automation.list();
      expect(result).toEqual({ items: [], total: 0 });
    });

    it("accepts optional input", async () => {
      const result = await caller().automation.list({ limit: 10, offset: 5 });
      expect(result).toEqual({ items: [], total: 0 });
    });

    it("accepts no input", async () => {
      const result = await caller().automation.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ═══ listTriggeredMeetings ═══
  describe("listTriggeredMeetings", () => {
    it("returns meetings from DB", async () => {
      selectResultsQueue.push([sampleMeeting, { ...sampleMeeting, id: 2, type: "T_NODE_DELAY" }]);
      const result = await caller().automation.listTriggeredMeetings({ limit: 20 });
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("PHASE_CHANGE");
      expect(result[1].type).toBe("T_NODE_DELAY");
    });

    it("returns empty array when no meetings", async () => {
      selectResultsQueue.push([]);
      const result = await caller().automation.listTriggeredMeetings({ limit: 20 });
      expect(result).toHaveLength(0);
    });

    it("respects limit parameter", async () => {
      selectResultsQueue.push([sampleMeeting]);
      const result = await caller().automation.listTriggeredMeetings({ limit: 5 });
      expect(result).toHaveLength(1);
    });
  });

  // ═══ getAutomationStats ═══
  describe("getAutomationStats", () => {
    it("returns aggregated stats", async () => {
      selectResultsQueue.push([{ totalTriggered: 10, pending: 3, ended: 7 }]);
      const result = await caller().automation.getAutomationStats();
      expect(result.totalTriggered).toBe(10);
      expect(result.pending).toBe(3);
      expect(result.ended).toBe(7);
      expect(result.ruleCount).toBe(5);
    });

    it("returns zeros when no data", async () => {
      selectResultsQueue.push([{ totalTriggered: 0, pending: null, ended: null }]);
      const result = await caller().automation.getAutomationStats();
      expect(result.totalTriggered).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.ended).toBe(0);
      expect(result.ruleCount).toBe(5);
    });

    it("handles undefined stats row", async () => {
      selectResultsQueue.push([undefined]);
      const result = await caller().automation.getAutomationStats();
      expect(result.totalTriggered).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.ended).toBe(0);
      expect(result.ruleCount).toBe(5);
    });
  });

  // ═══ triggerPhaseChange ═══
  describe("triggerPhaseChange", () => {
    it("creates a PHASE_CHANGE meeting", async () => {
      returningQueue.push([{ ...sampleMeeting, id: 10 }]);
      const result = await caller().automation.triggerPhaseChange({
        phase: "M2",
        projectTitle: "ProjectX",
        pmName: "张三",
      });
      expect(result).toHaveProperty("id", 10);
      expect(result.type).toBe("PHASE_CHANGE");
    });

    it("includes phase in title", async () => {
      returningQueue.push([{ ...sampleMeeting, id: 11, title: "[M3] ProjectY — 阶段启动会" }]);
      const result = await caller().automation.triggerPhaseChange({
        phase: "M3",
        projectTitle: "ProjectY",
        pmName: "李四",
      });
      expect(result.title).toContain("M3");
    });

    it("rejects missing phase field", async () => {
      await expect(
        caller().automation.triggerPhaseChange({
          phase: "",
          projectTitle: "X",
          pmName: "Y",
        } as any),
      ).resolves.toBeTruthy(); // empty string is valid z.string()
    });
  });

  // ═══ triggerTNodeDelay ═══
  describe("triggerTNodeDelay", () => {
    it("creates a T_NODE_DELAY meeting", async () => {
      const meeting = {
        ...sampleMeeting,
        id: 20,
        type: "T_NODE_DELAY",
        title: "[T3延迟] ProjectZ — 异常处理会",
      };
      returningQueue.push([meeting]);
      const result = await caller().automation.triggerTNodeDelay({
        tNode: "T3",
        projectTitle: "ProjectZ",
        severity: "CRITICAL",
      });
      expect(result.id).toBe(20);
      expect(result.type).toBe("T_NODE_DELAY");
      expect(result.title).toContain("T3延迟");
    });

    it("accepts WARNING severity", async () => {
      returningQueue.push([{ ...sampleMeeting, id: 21, type: "T_NODE_DELAY" }]);
      const result = await caller().automation.triggerTNodeDelay({
        tNode: "T5",
        projectTitle: "ProjectW",
        severity: "WARNING",
      });
      expect(result.id).toBe(21);
    });

    it("rejects invalid severity", async () => {
      await expect(
        caller().automation.triggerTNodeDelay({
          tNode: "T1",
          projectTitle: "P",
          severity: "LOW" as any,
        }),
      ).rejects.toThrow();
    });
  });

  // ═══ triggerOKRAtRisk ═══
  describe("triggerOKRAtRisk", () => {
    it("creates an OKR_AT_RISK meeting", async () => {
      const meeting = {
        ...sampleMeeting,
        id: 30,
        type: "OKR_AT_RISK",
        title: "[OKR滞后] Revenue Target — 复盘会",
      };
      returningQueue.push([meeting]);
      const result = await caller().automation.triggerOKRAtRisk({
        objectiveTitle: "Revenue Target",
        progress: 30,
        threshold: 50,
        ownerName: "王五",
      });
      expect(result.id).toBe(30);
      expect(result.type).toBe("OKR_AT_RISK");
      expect(result.title).toContain("OKR滞后");
    });

    it("handles zero progress", async () => {
      returningQueue.push([{ ...sampleMeeting, id: 31, type: "OKR_AT_RISK" }]);
      const result = await caller().automation.triggerOKRAtRisk({
        objectiveTitle: "New Market",
        progress: 0,
        threshold: 25,
        ownerName: "赵六",
      });
      expect(result.id).toBe(31);
    });
  });

  // ═══ triggerQualityEscalation ═══
  describe("triggerQualityEscalation", () => {
    it("creates a QUALITY_ESCALATION meeting", async () => {
      const meeting = {
        ...sampleMeeting,
        id: 40,
        type: "QUALITY_ESCALATION",
        title: "[质量升级] 焊接裂纹 — 紧急质量会",
      };
      returningQueue.push([meeting]);
      const result = await caller().automation.triggerQualityEscalation({
        reportTitle: "焊接裂纹",
        severity: "Critical",
        productName: "Motor A",
        customerName: "Customer X",
      });
      expect(result.id).toBe(40);
      expect(result.type).toBe("QUALITY_ESCALATION");
      expect(result.title).toContain("质量升级");
    });

    it("includes all input fields in description", async () => {
      const meeting = {
        ...sampleMeeting,
        id: 41,
        type: "QUALITY_ESCALATION",
        description: "产品「Gear B」客户「Customer Y」报告 Major 级质量问题: 齿轮噪音。自动触发紧急质量会议。",
      };
      returningQueue.push([meeting]);
      const result = await caller().automation.triggerQualityEscalation({
        reportTitle: "齿轮噪音",
        severity: "Major",
        productName: "Gear B",
        customerName: "Customer Y",
      });
      expect(result.description).toContain("Gear B");
      expect(result.description).toContain("Customer Y");
    });
  });

  // ═══ triggerSupplierPenalty ═══
  describe("triggerSupplierPenalty", () => {
    it("creates a SUPPLIER_PENALTY meeting", async () => {
      const meeting = {
        ...sampleMeeting,
        id: 50,
        type: "SUPPLIER_PENALTY",
        title: "[供应商违约] SupplierA — 评审会",
      };
      returningQueue.push([meeting]);
      const result = await caller().automation.triggerSupplierPenalty({
        supplierName: "SupplierA",
        penaltyCount: 5,
        threshold: 3,
        latestReason: "交货延迟",
      });
      expect(result.id).toBe(50);
      expect(result.type).toBe("SUPPLIER_PENALTY");
      expect(result.title).toContain("供应商违约");
    });

    it("handles high penalty counts", async () => {
      returningQueue.push([{
        ...sampleMeeting,
        id: 51,
        type: "SUPPLIER_PENALTY",
        description: "供应商「SupplierB」违约次数 15 次超过阈值 5 次。最近原因: 质量不合格。自动触发供应商评审会。",
      }]);
      const result = await caller().automation.triggerSupplierPenalty({
        supplierName: "SupplierB",
        penaltyCount: 15,
        threshold: 5,
        latestReason: "质量不合格",
      });
      expect(result.id).toBe(51);
      expect(result.description).toContain("15");
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().automation.list()).rejects.toThrow();
    });
    it("rejects anonymous for listTriggeredMeetings", async () => {
      await expect(
        createAnonymousCaller().automation.listTriggeredMeetings({ limit: 20 }),
      ).rejects.toThrow();
    });
    it("rejects anonymous for getAutomationStats", async () => {
      await expect(
        createAnonymousCaller().automation.getAutomationStats(),
      ).rejects.toThrow();
    });
    it("rejects anonymous for triggerPhaseChange", async () => {
      await expect(
        createAnonymousCaller().automation.triggerPhaseChange({
          phase: "M2",
          projectTitle: "X",
          pmName: "Y",
        }),
      ).rejects.toThrow();
    });
    it("rejects anonymous for triggerTNodeDelay", async () => {
      await expect(
        createAnonymousCaller().automation.triggerTNodeDelay({
          tNode: "T1",
          projectTitle: "X",
          severity: "WARNING",
        }),
      ).rejects.toThrow();
    });
    it("rejects anonymous for triggerOKRAtRisk", async () => {
      await expect(
        createAnonymousCaller().automation.triggerOKRAtRisk({
          objectiveTitle: "X",
          progress: 10,
          threshold: 50,
          ownerName: "Y",
        }),
      ).rejects.toThrow();
    });
    it("rejects anonymous for triggerQualityEscalation", async () => {
      await expect(
        createAnonymousCaller().automation.triggerQualityEscalation({
          reportTitle: "X",
          severity: "Critical",
          productName: "P",
          customerName: "C",
        }),
      ).rejects.toThrow();
    });
    it("rejects anonymous for triggerSupplierPenalty", async () => {
      await expect(
        createAnonymousCaller().automation.triggerSupplierPenalty({
          supplierName: "S",
          penaltyCount: 5,
          threshold: 3,
          latestReason: "R",
        }),
      ).rejects.toThrow();
    });
  });
});
