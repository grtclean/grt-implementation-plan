/**
 * O365 Sync Enhancement Service (Task #66)
 * Simulated Office 365 sync with caching, webhook, incremental sync.
 */

export interface O365SyncConfig {
  tenantId: string;
  clientId: string;
  syncInterval: number;
  webhookUrl: string;
  lastSyncAt: Date | null;
}

interface SyncResult { synced: number; errors: number; nextSyncAt: Date; }
interface CalendarEvent { id: string; subject: string; start: string; end: string; organizer: string; location: string; }
interface EmailMessage { id: string; subject: string; from: string; receivedAt: string; hasAttachments: boolean; preview: string; }
interface WebhookRegistration { id: string; resource: string; changeType: string; notificationUrl: string; expirationDateTime: string; status: string; }
interface WebhookPayload { subscriptionId: string; changeType: string; resource: string; resourceData: Record<string, string>; tenantId: string; }
interface SyncHealthMetrics { calendarSyncStatus: string; emailSyncStatus: string; lastCalendarSync: Date | null; lastEmailSync: Date | null; totalCalendarEvents: number; totalEmails: number; activeWebhooks: number; errorRate: number; uptime: number; }
interface CacheEntry<T> { data: T; expiresAt: number; }

const calendarCache = new Map<string, CacheEntry<CalendarEvent[]>>();
const emailCache = new Map<string, CacheEntry<EmailMessage[]>>();
const webhookRegistry = new Map<string, WebhookRegistration>();
const CACHE_TTL_MS = 300000;
let lastCalendarSyncAt: Date | null = null;
let lastEmailSyncAt: Date | null = null;
let syncErrors = 0;
let totalCalendarSynced = 0;
let totalEmailsSynced = 0;

function getCacheEntry<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}

function setCacheEntry<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function generateCalendarEvents(_since: Date | null): CalendarEvent[] {
  const n = Math.floor(Math.random() * 8) + 2;
  const events: CalendarEvent[] = [];
  const subjects = ["Project Review", "Sprint Planning", "Client Demo", "Design Review", "All Hands", "Training"];
  for (let i = 0; i < n; i++) {
    const sH = 8 + Math.floor(Math.random() * 8);
    const start = new Date(); start.setHours(sH, 0, 0, 0);
    const end = new Date(start); end.setHours(sH + 1);
    events.push({ id: "evt-" + Date.now() + "-" + i, subject: subjects[i % subjects.length],
      start: start.toISOString(), end: end.toISOString(),
      organizer: "user" + (Math.floor(Math.random() * 20) + 1) + "@grt.com",
      location: "Room " + String.fromCharCode(65 + (i % 5)) });
  }
  return events;
}

function generateEmails(folderId: string): EmailMessage[] {
  const n = Math.floor(Math.random() * 12) + 3;
  const emails: EmailMessage[] = [];
  const subjects = ["RE: Equipment Delivery", "FW: Purchase Order", "Action Required: Safety", "Meeting Notes", "BOM Update", "Customer Feedback"];
  for (let i = 0; i < n; i++) {
    const received = new Date();
    received.setMinutes(received.getMinutes() - Math.floor(Math.random() * 480));
    emails.push({ id: "msg-" + Date.now() + "-" + i, subject: subjects[i % subjects.length],
      from: "contact" + (Math.floor(Math.random() * 30) + 1) + "@partner.com",
      receivedAt: received.toISOString(), hasAttachments: Math.random() > 0.6,
      preview: "Simulated email preview (folder: " + folderId + ")" });
  }
  return emails;
}

export async function syncCalendarEvents(config?: Partial<O365SyncConfig>): Promise<SyncResult> {
  const cacheKey = config?.tenantId ?? "default";
  const cached = getCacheEntry(calendarCache, cacheKey);
  if (cached) { return { synced: cached.length, errors: 0, nextSyncAt: new Date(Date.now() + (config?.syncInterval ?? 15) * 60000) }; }
  try {
    const events = generateCalendarEvents(lastCalendarSyncAt);
    setCacheEntry(calendarCache, cacheKey, events);
    lastCalendarSyncAt = new Date();
    totalCalendarSynced += events.length;
    return { synced: events.length, errors: 0, nextSyncAt: new Date(Date.now() + (config?.syncInterval ?? 15) * 60000) };
  } catch (_err) { syncErrors++; return { synced: 0, errors: 1, nextSyncAt: new Date(Date.now() + 60000) }; }
}

export async function syncEmails(folderId?: string): Promise<SyncResult> {
  const folder = folderId ?? "inbox";
  const cacheKey = "email-" + folder;
  const cached = getCacheEntry(emailCache, cacheKey);
  if (cached) { return { synced: cached.length, errors: 0, nextSyncAt: new Date(Date.now() + 600000) }; }
  try {
    const emails = generateEmails(folder);
    setCacheEntry(emailCache, cacheKey, emails);
    lastEmailSyncAt = new Date(); totalEmailsSynced += emails.length;
    return { synced: emails.length, errors: 0, nextSyncAt: new Date(Date.now() + 600000) };
  } catch (_err) { syncErrors++; return { synced: 0, errors: 1, nextSyncAt: new Date(Date.now() + 60000) }; }
}

export async function registerWebhook(resource: string): Promise<WebhookRegistration> {
  const id = "wh-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
  const expiration = new Date(); expiration.setDate(expiration.getDate() + 3);
  const registration: WebhookRegistration = { id, resource, changeType: "created,updated,deleted",
    notificationUrl: "https://grt-system.com/api/webhooks/o365/" + id,
    expirationDateTime: expiration.toISOString(), status: "active" };
  webhookRegistry.set(id, registration);
  return registration;
}

export async function handleWebhookNotification(payload: WebhookPayload): Promise<{ processed: boolean; action: string }> {
  const sub = webhookRegistry.get(payload.subscriptionId);
  if (!sub) { return { processed: false, action: "subscription_not_found" }; }
  if (payload.resource.includes("calendar")) { calendarCache.clear(); }
  else if (payload.resource.includes("messages")) { emailCache.clear(); }
  return { processed: true, action: "processed_" + payload.changeType + "_on_" + payload.resource };
}

export async function getSyncStatus(): Promise<SyncHealthMetrics> {
  const totalOps = totalCalendarSynced + totalEmailsSynced;
  return { calendarSyncStatus: lastCalendarSyncAt ? "healthy" : "not_started",
    emailSyncStatus: lastEmailSyncAt ? "healthy" : "not_started",
    lastCalendarSync: lastCalendarSyncAt, lastEmailSync: lastEmailSyncAt,
    totalCalendarEvents: totalCalendarSynced, totalEmails: totalEmailsSynced,
    activeWebhooks: webhookRegistry.size,
    errorRate: totalOps > 0 ? syncErrors / totalOps : 0, uptime: 99.9 };
}