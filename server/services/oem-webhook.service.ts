/**
 * OEM Webhook Delivery Service
 *
 * Provides:
 *   - triggerOemWebhooks() — find subscribers for an event, queue async deliveries
 *   - Exponential backoff schedule: 30s → 2min → 10min → 1hr → 4hr
 */

import { requireDb } from "../db";
import { oemWebhooks, oemWebhookDeliveries } from "../../drizzle/oem-portal-schema";
import { eq, and, sql } from "drizzle-orm";
import { submitTask } from "./task-worker.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("oem-webhook");

// Exponential backoff: attempt → delay in ms
const BACKOFF_SCHEDULE_MS = [
  30_000,       // attempt 1: 30s
  120_000,      // attempt 2: 2min
  600_000,      // attempt 3: 10min
  3_600_000,    // attempt 4: 1hr
  14_400_000,   // attempt 5: 4hr
];

export function getBackoffDelay(attempt: number): number {
  return BACKOFF_SCHEDULE_MS[Math.min(attempt, BACKOFF_SCHEDULE_MS.length - 1)] ?? 14_400_000;
}

/**
 * Trigger webhooks for an event type + client.
 * Called from any mutation that signals a business event (e.g., batch cleaned, machine fault).
 *
 * @returns Number of webhooks triggered
 */
export async function triggerOemWebhooks(
  eventType: string,
  clientId: number,
  payload: Record<string, unknown>,
): Promise<number> {
  const db = await requireDb();

  // Find active webhooks for this client that subscribe to this event type
  const webhooks = await db.select({
    id: oemWebhooks.id,
    endpointUrl: oemWebhooks.endpointUrl,
    events: oemWebhooks.events,
  }).from(oemWebhooks)
    .where(and(
      eq(oemWebhooks.clientId, clientId),
      eq(oemWebhooks.status, "active"),
    ))
    .limit(50);

  // Filter by event subscription (events is a JSON string[] column)
  const matching = webhooks.filter(w => {
    const events = w.events as string[];
    return Array.isArray(events) && events.includes(eventType);
  });

  if (matching.length === 0) return 0;

  let triggered = 0;

  for (const webhook of matching) {
    try {
      // Insert delivery record
      const [delivery] = await db.insert(oemWebhookDeliveries).values({
        webhookId: webhook.id,
        clientId,
        eventType,
        payload: { ...payload, event: eventType, timestamp: new Date().toISOString() },
        status: "pending",
        attemptCount: 0,
        maxAttempts: 5,
      }).returning();

      // Queue async delivery via task worker
      await submitTask("OEM_WEBHOOK_DELIVERY", {
        deliveryId: delivery.id,
        webhookId: webhook.id,
        payload: delivery.payload,
        attempt: 0,
      }, "system", { maxRetries: 5 });

      // Update last triggered
      db.update(oemWebhooks)
        .set({ lastTriggeredAt: new Date() })
        .where(eq(oemWebhooks.id, webhook.id))
        .catch(() => {});

      triggered++;
    } catch (err) {
      log.error({ err, webhookId: webhook.id, eventType }, "Failed to queue webhook delivery");
    }
  }

  log.info({ eventType, clientId, triggered, total: matching.length }, "OEM webhooks triggered");
  return triggered;
}
