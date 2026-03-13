/**
 * Sync Dispatch Router — Unit Tests
 *
 * Tests the O365 Encrypted Email Ferry procedures:
 *   dispatch  — desensitize orders + send via O365 SMTP
 *   preview   — desensitize only (dry-run, no email)
 *
 * Mocking strategy: desensitizer and mailer are fully mocked
 * so tests are isolated from PII logic and SMTP transport.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock hoisted fns ─────────────────────────────────────
const { mockDesensitize, mockSendMail } = vi.hoisted(() => ({
  mockDesensitize: vi.fn(() => ({
    sanitizedOrders: [
      { order_id: "ORD-001", sku: "SKU-A", quantity: 10, specs: "Standard" },
    ],
    audit: {
      timestamp: "2026-03-01T00:00:00.000Z",
      fieldsRetained: ["order_id", "sku", "quantity", "specs"],
      fieldsDropped: [
        "customer_name",
        "customer_email",
        "unit_price",
        "total_price",
      ],
    },
  })),
  mockSendMail: vi.fn(async () => ({
    success: true,
    simulated: true,
    messageId: "msg-123",
    error: null,
  })),
}));

vi.mock("../lib/desensitizer", () => ({
  desensitizeOrders: mockDesensitize,
}));

vi.mock("../lib/mailer", () => ({
  sendSecureMail: mockSendMail,
}));

// ── Sample input data ────────────────────────────────────
const sampleOrder = {
  order_id: "ORD-001",
  customer_name: "John Doe",
  customer_email: "john@example.com",
  customer_phone: "+1-555-0100",
  unit_price: 99.99,
  total_price: 999.9,
  sku: "SKU-A",
  quantity: 10,
  specs: "Standard",
  shipping_address: "123 Main St, Springfield, IL",
  payment_method: "credit_card",
};

const sampleOrder2 = {
  order_id: "ORD-002",
  customer_name: "Jane Smith",
  customer_email: "jane@example.com",
  unit_price: 49.5,
  total_price: 247.5,
  sku: "SKU-B",
  quantity: 5,
  specs: "Premium",
};

// ── Reset ────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────
describe("syncDispatch router", () => {
  // ═══ dispatch mutation ═══════════════════════════════════

  describe("dispatch", () => {
    it("calls desensitize + sendMail and returns success with desensitizedPayload and audit", async () => {
      const caller = createAdminCaller();
      const result = await caller.syncDispatch.dispatch({
        orders: [sampleOrder],
      });

      // Verify desensitizer was called
      expect(mockDesensitize).toHaveBeenCalledTimes(1);

      // Verify mailer was called
      expect(mockSendMail).toHaveBeenCalledTimes(1);

      // Verify return shape
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("simulated", true);
      expect(result).toHaveProperty("messageId", "msg-123");
      expect(result).toHaveProperty("error", null);
      expect(result).toHaveProperty("desensitizedPayload");
      expect(result.desensitizedPayload).toEqual([
        { order_id: "ORD-001", sku: "SKU-A", quantity: 10, specs: "Standard" },
      ]);
      expect(result).toHaveProperty("audit");
      expect(result.audit.fieldsRetained).toContain("order_id");
      expect(result.audit.fieldsDropped).toContain("customer_name");
    });

    it("passes the orders array to desensitizeOrders", async () => {
      const orders = [sampleOrder, sampleOrder2];
      const caller = createAdminCaller();
      await caller.syncDispatch.dispatch({ orders });

      // The first argument to desensitizeOrders should be the orders array
      expect(mockDesensitize).toHaveBeenCalledWith(orders);
    });

    it("handles email failure (sendSecureMail returns success=false)", async () => {
      mockSendMail.mockResolvedValueOnce({
        success: false,
        simulated: false,
        messageId: undefined,
        error: "SMTP connection refused",
      });

      const caller = createAdminCaller();
      const result = await caller.syncDispatch.dispatch({
        orders: [sampleOrder],
      });

      // Desensitizer should still have been called
      expect(mockDesensitize).toHaveBeenCalledTimes(1);
      // Mail was attempted
      expect(mockSendMail).toHaveBeenCalledTimes(1);

      // Result reflects the email failure
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error", "SMTP connection refused");

      // Desensitized payload is still returned (proof of what WOULD have been sent)
      expect(result).toHaveProperty("desensitizedPayload");
      expect(result).toHaveProperty("audit");
    });

    it("rejects empty orders array (min 1)", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.syncDispatch.dispatch({ orders: [] })
      ).rejects.toThrow();

      // Neither dependency should have been called
      expect(mockDesensitize).not.toHaveBeenCalled();
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  // ═══ preview mutation ═══════════════════════════════════

  describe("preview", () => {
    it("returns desensitized payload without sending email", async () => {
      const caller = createAdminCaller();
      const result = await caller.syncDispatch.preview({
        orders: [sampleOrder],
      });

      // Verify desensitizer was called
      expect(mockDesensitize).toHaveBeenCalledTimes(1);

      // Verify return shape
      expect(result).toHaveProperty("desensitizedPayload");
      expect(result.desensitizedPayload).toEqual([
        { order_id: "ORD-001", sku: "SKU-A", quantity: 10, specs: "Standard" },
      ]);
      expect(result).toHaveProperty("audit");
      expect(result.audit.fieldsRetained).toEqual([
        "order_id",
        "sku",
        "quantity",
        "specs",
      ]);
      expect(result.audit.fieldsDropped).toEqual([
        "customer_name",
        "customer_email",
        "unit_price",
        "total_price",
      ]);
    });

    it("does NOT call sendSecureMail", async () => {
      const caller = createAdminCaller();
      await caller.syncDispatch.preview({ orders: [sampleOrder] });

      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it("rejects empty orders array (min 1)", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.syncDispatch.preview({ orders: [] })
      ).rejects.toThrow();

      expect(mockDesensitize).not.toHaveBeenCalled();
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════════

  describe("authentication", () => {
    it("rejects anonymous caller for dispatch", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.syncDispatch.dispatch({ orders: [sampleOrder] })
      ).rejects.toThrow();
    });

    it("rejects anonymous caller for preview", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.syncDispatch.preview({ orders: [sampleOrder] })
      ).rejects.toThrow();
    });
  });
});
