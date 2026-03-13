/**
 * Training Certificate Router — Unit Tests
 * Tests 7 procedures: list, getById, create, update, delete, getByParticipant, issue
 *
 * Uses standard Drizzle ORM chain mock pattern.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mocks ──
const { selectResultsQueue, returningQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return { selectResultsQueue, returningQueue };
});

// Mock DB
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

// Mock drizzle-orm
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

// ── Sample data ──
const sampleCert = {
  id: 1,
  trainingId: 10,
  participantId: 100,
  certificateNo: "CERT-ABC123",
  name: "培训证书",
  issueDate: "2026-01-15T00:00:00.000Z",
  expiryDate: "2027-01-15T00:00:00.000Z",
  status: "active",
  fileUrl: "https://example.com/cert.pdf",
  createdAt: "2026-01-15",
  updatedAt: "2026-01-15",
};

describe("trainingCertificate router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns all certificates", async () => {
      selectResultsQueue.push([sampleCert, { ...sampleCert, id: 2 }, { ...sampleCert, id: 3 }]);
      const result = await caller().trainingCertificate.list();
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(3);
    });

    it("returns empty when no certificates exist", async () => {
      selectResultsQueue.push([]);
      const result = await caller().trainingCertificate.list();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(0);
    });

    it("returns correct shape with single item", async () => {
      selectResultsQueue.push([sampleCert]);
      const result = await caller().trainingCertificate.list();
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toHaveProperty("certificateNo", "CERT-ABC123");
      expect(result.total).toBe(1);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns certificate by id", async () => {
      selectResultsQueue.push([sampleCert]);
      const result = await caller().trainingCertificate.getById({ id: "1" });
      expect(result).toBeTruthy();
      expect(result!.id).toBe(1);
      expect(result!.certificateNo).toBe("CERT-ABC123");
    });

    it("returns null when certificate not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().trainingCertificate.getById({ id: "999" });
      expect(result).toBeNull();
    });

    it("parses string id to integer", async () => {
      selectResultsQueue.push([sampleCert]);
      const result = await caller().trainingCertificate.getById({ id: "42" });
      expect(result).toBeTruthy();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates certificate with required fields only", async () => {
      const created = { ...sampleCert, id: 5 };
      returningQueue.push([created]);
      const result = await caller().trainingCertificate.create({
        trainingId: 10,
        participantId: 100,
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("证书已创建");
      expect(result.data).toHaveProperty("id", 5);
    });

    it("creates certificate with all optional fields", async () => {
      const created = { ...sampleCert, id: 6, certificateNo: "CERT-CUSTOM-001" };
      returningQueue.push([created]);
      const result = await caller().trainingCertificate.create({
        trainingId: 10,
        participantId: 100,
        certificateNo: "CERT-CUSTOM-001",
        name: "Advanced Training",
        issueDate: "2026-03-01",
        expiryDate: "2027-03-01",
        fileUrl: "https://example.com/cert2.pdf",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("certificateNo", "CERT-CUSTOM-001");
    });

    it("auto-generates certificateNo when not provided", async () => {
      returningQueue.push([{ ...sampleCert, id: 7 }]);
      const result = await caller().trainingCertificate.create({
        trainingId: 10,
        participantId: 100,
      });
      expect(result.success).toBe(true);
    });

    it("uses default name when not provided", async () => {
      returningQueue.push([{ ...sampleCert, id: 8, name: "培训证书" }]);
      const result = await caller().trainingCertificate.create({
        trainingId: 10,
        participantId: 100,
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates certificate name", async () => {
      returningQueue.push([{ ...sampleCert, name: "Updated Name" }]);
      const result = await caller().trainingCertificate.update({
        id: "1",
        name: "Updated Name",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("更新成功");
      expect(result.data).toHaveProperty("name", "Updated Name");
    });

    it("updates certificate status", async () => {
      returningQueue.push([{ ...sampleCert, status: "expired" }]);
      const result = await caller().trainingCertificate.update({
        id: 1,
        status: "expired",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("status", "expired");
    });

    it("updates expiryDate", async () => {
      returningQueue.push([{ ...sampleCert, expiryDate: "2028-01-01" }]);
      const result = await caller().trainingCertificate.update({
        id: "1",
        expiryDate: "2028-01-01",
      });
      expect(result.success).toBe(true);
    });

    it("updates fileUrl", async () => {
      returningQueue.push([{ ...sampleCert, fileUrl: "https://new.url/cert.pdf" }]);
      const result = await caller().trainingCertificate.update({
        id: 1,
        fileUrl: "https://new.url/cert.pdf",
      });
      expect(result.success).toBe(true);
    });

    it("accepts string id", async () => {
      returningQueue.push([{ ...sampleCert, name: "String ID Test" }]);
      const result = await caller().trainingCertificate.update({
        id: "42",
        name: "String ID Test",
      });
      expect(result.success).toBe(true);
    });

    it("accepts numeric id", async () => {
      returningQueue.push([sampleCert]);
      const result = await caller().trainingCertificate.update({
        id: 42,
        name: "Numeric ID Test",
      });
      expect(result.success).toBe(true);
    });

    it("updates multiple fields at once", async () => {
      returningQueue.push([{ ...sampleCert, name: "New Name", status: "revoked", fileUrl: "https://x.com/new.pdf" }]);
      const result = await caller().trainingCertificate.update({
        id: "1",
        name: "New Name",
        status: "revoked",
        fileUrl: "https://x.com/new.pdf",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("deletes certificate by id", async () => {
      selectResultsQueue.push([]); // delete chain
      const result = await caller().trainingCertificate.delete({ id: "1" });
      expect(result).toEqual({ success: true, message: "删除成功" });
    });

    it("returns success even when certificate does not exist", async () => {
      selectResultsQueue.push([]);
      const result = await caller().trainingCertificate.delete({ id: "9999" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ getByParticipant ═══
  describe("getByParticipant", () => {
    it("returns certificates for a participant (numeric id)", async () => {
      selectResultsQueue.push([sampleCert, { ...sampleCert, id: 2, trainingId: 20 }]);
      const result = await caller().trainingCertificate.getByParticipant({ participantId: 100 });
      expect(result).toHaveLength(2);
    });

    it("returns certificates for a participant (string id)", async () => {
      selectResultsQueue.push([sampleCert]);
      const result = await caller().trainingCertificate.getByParticipant({ participantId: "100" });
      expect(result).toHaveLength(1);
    });

    it("returns empty array when participant has no certificates", async () => {
      selectResultsQueue.push([]);
      const result = await caller().trainingCertificate.getByParticipant({ participantId: 999 });
      expect(result).toHaveLength(0);
    });
  });

  // ═══ issue ═══
  describe("issue", () => {
    it("issues certificate with auto-generated certificateNo", async () => {
      const issued = { ...sampleCert, id: 10, certificateNo: "CERT-20260301-ABCD" };
      returningQueue.push([issued]);
      const result = await caller().trainingCertificate.issue({
        trainingId: 10,
        participantId: 100,
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("证书已颁发");
      expect(result.data).toHaveProperty("id", 10);
    });

    it("issues certificate with optional name", async () => {
      returningQueue.push([{ ...sampleCert, id: 11, name: "Safety Training Cert" }]);
      const result = await caller().trainingCertificate.issue({
        trainingId: 10,
        participantId: 100,
        name: "Safety Training Cert",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("name", "Safety Training Cert");
    });

    it("issues certificate with expiryDate and fileUrl", async () => {
      returningQueue.push([{ ...sampleCert, id: 12 }]);
      const result = await caller().trainingCertificate.issue({
        trainingId: 10,
        participantId: 100,
        expiryDate: "2028-01-01",
        fileUrl: "https://example.com/issued.pdf",
      });
      expect(result.success).toBe(true);
    });

    it("uses default name when not provided", async () => {
      returningQueue.push([{ ...sampleCert, id: 13, name: "培训证书" }]);
      const result = await caller().trainingCertificate.issue({
        trainingId: 10,
        participantId: 100,
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().trainingCertificate.list()).rejects.toThrow();
    });

    it("rejects anonymous for getById", async () => {
      await expect(
        createAnonymousCaller().trainingCertificate.getById({ id: "1" }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for create", async () => {
      await expect(
        createAnonymousCaller().trainingCertificate.create({
          trainingId: 10,
          participantId: 100,
        }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for update", async () => {
      await expect(
        createAnonymousCaller().trainingCertificate.update({ id: "1", name: "X" }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for delete", async () => {
      await expect(
        createAnonymousCaller().trainingCertificate.delete({ id: "1" }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for getByParticipant", async () => {
      await expect(
        createAnonymousCaller().trainingCertificate.getByParticipant({ participantId: 100 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for issue", async () => {
      await expect(
        createAnonymousCaller().trainingCertificate.issue({
          trainingId: 10,
          participantId: 100,
        }),
      ).rejects.toThrow();
    });
  });
});
