/**
 * Office 365 Encrypted Email Ferry — Sync Dispatch Router
 *
 * Cross-border data pipeline: US Global Hub → China On-Premise Hub
 *
 * Flow:
 *   1. Frontend sends raw US orders (with PII) to `dispatch` mutation
 *   2. Server runs orders through the strict whitelist desensitizer
 *   3. Sanitized JSON is attached to an O365 email → cn-receive@gerrytech.com
 *   4. Response includes the EXACT payload that was emailed (proof of PII stripping)
 *
 * Procedures:
 *   dispatch  — Main sync: desensitize → email → return proof
 *   preview   — Dry-run: desensitize only, no email sent
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  desensitizeOrders,
  type RawUSOrder,
} from "../lib/desensitizer";
import { sendSecureMail } from "../lib/mailer";

// ── Input schema: raw US order with all PII fields ─────────
const rawOrderSchema = z.object({
  order_id: z.string(),
  customer_name: z.string(),
  customer_email: z.string(),
  customer_phone: z.string().optional(),
  unit_price: z.number(),
  total_price: z.number(),
  sku: z.string(),
  quantity: z.number(),
  specs: z.string(),
  shipping_address: z.string().optional(),
  payment_method: z.string().optional(),
});

export const syncDispatchRouter = router({
  // ── Main dispatch: desensitize + email via O365 ──────────
  dispatch: protectedProcedure
    .input(
      z.object({
        orders: z.array(rawOrderSchema).min(1),
      })
    )
    .mutation(async ({ input }) => {
      // Step 1: Run through the strict whitelist desensitizer
      // This DROPS all PII (name, email, price, phone, address)
      const { sanitizedOrders, audit } = desensitizeOrders(
        input.orders as RawUSOrder[]
      );

      // Step 2: Format the sanitized data as a JSON attachment
      const jsonPayload = JSON.stringify(sanitizedOrders, null, 2);

      // Step 3: Send via Office 365 SMTP to the China hub
      const emailResult = await sendSecureMail({
        to: "cn-receive@gerrytech.com",
        subject: "[GRT Secure Sync] US Orders Dispatch",
        body: [
          "Cross-Border Data Sync — Automated Dispatch",
          "",
          `Orders: ${sanitizedOrders.length}`,
          `Timestamp: ${audit.timestamp}`,
          `Fields retained: ${audit.fieldsRetained.join(", ")}`,
          `Fields DROPPED (PII): ${audit.fieldsDropped.join(", ")}`,
          "",
          "Desensitized payload attached as JSON.",
          "",
          "— GRT Office 365 Email Ferry",
        ].join("\n"),
        attachments: [
          {
            filename: `us-orders-sync-${Date.now()}.json`,
            content: jsonPayload,
            contentType: "application/json",
          },
        ],
      });

      // Step 4: Return proof of what was sent (for CEO verification)
      return {
        success: emailResult.success,
        simulated: emailResult.simulated,
        messageId: emailResult.messageId,
        error: emailResult.error,
        // The EXACT payload that was emailed — proves PII was stripped
        desensitizedPayload: sanitizedOrders,
        audit,
      };
    }),

  // ── Preview: dry-run desensitization without sending email ──
  preview: protectedProcedure
    .input(
      z.object({
        orders: z.array(rawOrderSchema).min(1),
      })
    )
    .mutation(({ input }) => {
      const { sanitizedOrders, audit } = desensitizeOrders(
        input.orders as RawUSOrder[]
      );
      return { desensitizedPayload: sanitizedOrders, audit };
    }),
});
