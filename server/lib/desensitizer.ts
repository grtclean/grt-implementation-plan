/**
 * Cross-Border Data Desensitizer — Strict PII Whitelist
 *
 * This module enforces a WHITELIST-ONLY approach to data export.
 * Only explicitly approved fields pass through. Everything else —
 * including any PII (names, emails, prices, phone numbers) — is
 * actively dropped, not merely redacted.
 *
 * Compliance:
 *   - GDPR Art. 44-49 (cross-border transfers)
 *   - China PIPL (个人信息保护法) cross-border rules
 *   - GRT internal data classification policy
 *
 * Design principle:
 *   Whitelist > Blacklist. A blacklist can miss new PII fields added
 *   later. A whitelist ensures ONLY known-safe fields are transmitted.
 */

// ── Types ──────────────────────────────────────────────────

/** Raw US order object — contains PII fields that must NOT cross the border */
export interface RawUSOrder {
  order_id: string;
  customer_name: string;    // PII — DROPPED
  customer_email: string;   // PII — DROPPED
  customer_phone?: string;  // PII — DROPPED
  unit_price: number;       // Commercial sensitive — DROPPED
  total_price: number;      // Commercial sensitive — DROPPED
  sku: string;
  quantity: number;
  specs: string;
  shipping_address?: string; // PII — DROPPED
  payment_method?: string;   // Financial PII — DROPPED
  [key: string]: unknown;    // Catch any future fields — all DROPPED
}

/** Desensitized order — ONLY these 4 fields survive the whitelist */
export interface DesensitizedOrder {
  order_id: string;
  sku: string;
  quantity: number;
  specs: string;
}

/** Audit trail of what was stripped */
export interface DesensitizeResult {
  // The safe, transmittable payload
  sanitizedOrders: DesensitizedOrder[];
  // Audit metadata
  audit: {
    totalOrders: number;
    fieldsRetained: string[];
    fieldsDropped: string[];
    timestamp: string;
  };
}

// ── Whitelist definition ───────────────────────────────────
// ONLY these field names are allowed through. Period.
const WHITELIST: ReadonlySet<string> = new Set([
  "order_id",
  "sku",
  "quantity",
  "specs",
]);

// ── Core desensitizer ──────────────────────────────────────
/**
 * desensitizeOrders — Applies strict whitelist filtering to an array
 * of raw US order objects.
 *
 * @param orders  Array of raw orders (may contain PII)
 * @returns       DesensitizeResult with sanitized data + audit trail
 *
 * Guarantees:
 *   1. Output contains ONLY { order_id, sku, quantity, specs }
 *   2. All PII fields are actively dropped (not redacted with "***")
 *   3. Any unknown/future fields are also dropped
 *   4. An audit trail records exactly which fields were stripped
 */
export function desensitizeOrders(
  orders: RawUSOrder[]
): DesensitizeResult {
  const allDropped = new Set<string>();

  const sanitizedOrders: DesensitizedOrder[] = orders.map((order) => {
    // Track which fields were dropped from this order
    for (const key of Object.keys(order)) {
      if (!WHITELIST.has(key)) {
        allDropped.add(key);
      }
    }

    // Return ONLY whitelisted fields — strict extraction, no passthrough
    return {
      order_id: order.order_id,
      sku: order.sku,
      quantity: order.quantity,
      specs: order.specs,
    };
  });

  const result: DesensitizeResult = {
    sanitizedOrders,
    audit: {
      totalOrders: orders.length,
      fieldsRetained: Array.from(WHITELIST),
      fieldsDropped: Array.from(allDropped).sort(),
      timestamp: new Date().toISOString(),
    },
  };

  // Console log for server-side audit trail
  console.log(`[Desensitizer] ══════════════════════════════════════`);
  console.log(`[Desensitizer] Processed ${orders.length} order(s)`);
  console.log(`[Desensitizer] Retained:  ${result.audit.fieldsRetained.join(", ")}`);
  console.log(`[Desensitizer] DROPPED:   ${result.audit.fieldsDropped.join(", ")}`);
  console.log(`[Desensitizer] ══════════════════════════════════════`);

  return result;
}
