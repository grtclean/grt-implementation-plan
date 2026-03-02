/**
 * Meeting Reminder Service
 * 会议提醒服务 - Webhook集成和通知功能
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("meeting-reminder");

// ============================================================================
// Types
// ============================================================================

export interface MeetingReminder {
  id: string;
  meetingId: string;
  channelId: string;
  reminderType: "email" | "webhook" | "in_app";
  reminderMinutes: number; // Minutes before meeting
  webhookUrl?: string;
  emailRecipients?: string[];
  status: "pending" | "sent" | "failed";
  scheduledAt: Date;
  sentAt?: Date;
  error?: string;
}

export interface WebhookPayload {
  event: "meeting_reminder" | "meeting_created" | "meeting_updated";
  meeting: {
    id: string;
    title: string;
    channelName: string;
    meetingDate: string;
    phase?: string;
    objective?: string;
  };
  reminder?: {
    minutesBefore: number;
    scheduledTime: string;
  };
  timestamp: string;
}

// ============================================================================
// Webhook Configuration
// ============================================================================

export async function getWebhookConfig(channelId: string) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM meeting_webhook_configs
    WHERE channel_id = ${channelId} AND is_active = TRUE
  `);
  return (result[0] as any[])[0] || null;
}

export async function createWebhookConfig(data: {
  channelId: string;
  webhookUrl: string;
  events: string[];
  createdBy: string;
}) {
  const db = await requireDb();
  const id = crypto.randomUUID();
  await db.execute(sql`
    INSERT INTO meeting_webhook_configs (id, channel_id, webhook_url, events, created_by, is_active)
    VALUES (${id}, ${data.channelId}, ${data.webhookUrl}, ${JSON.stringify(data.events)}, ${data.createdBy}, TRUE)
    ON DUPLICATE KEY UPDATE 
      webhook_url = ${data.webhookUrl},
      events = ${JSON.stringify(data.events)},
      is_active = TRUE
  `);
  return id;
}

export async function updateWebhookConfig(channelId: string, updates: {
  webhookUrl?: string;
  events?: string[];
  isActive?: boolean;
}) {
  const db = await requireDb();
  
  if (updates.webhookUrl !== undefined) {
    await db.execute(sql`
      UPDATE meeting_webhook_configs 
      SET webhook_url = ${updates.webhookUrl}
      WHERE channel_id = ${channelId}
    `);
  }
  
  if (updates.events !== undefined) {
    await db.execute(sql`
      UPDATE meeting_webhook_configs 
      SET events = ${JSON.stringify(updates.events)}
      WHERE channel_id = ${channelId}
    `);
  }
  
  if (updates.isActive !== undefined) {
    await db.execute(sql`
      UPDATE meeting_webhook_configs 
      SET is_active = ${updates.isActive}
      WHERE channel_id = ${channelId}
    `);
  }
}

// ============================================================================
// Reminder Management
// ============================================================================

export async function createReminder(data: {
  meetingId: string;
  channelId: string;
  reminderType: "email" | "webhook" | "in_app";
  reminderMinutes: number;
  webhookUrl?: string;
  emailRecipients?: string[];
  meetingDate: Date;
}) {
  const db = await requireDb();
  const id = crypto.randomUUID();
  const scheduledAt = new Date(data.meetingDate.getTime() - data.reminderMinutes * 60 * 1000);
  
  await db.execute(sql`
    INSERT INTO meeting_reminders_v2 (id, meeting_id, channel_id, reminder_type, reminder_minutes, webhook_url, email_recipients, status, scheduled_at)
    VALUES (${id}, ${data.meetingId}, ${data.channelId}, ${data.reminderType}, ${data.reminderMinutes}, ${data.webhookUrl || null}, ${data.emailRecipients ? JSON.stringify(data.emailRecipients) : null}, 'pending', ${scheduledAt.toISOString()})
  `);
  
  return { id, scheduledAt };
}

export async function getPendingReminders() {
  const db = await requireDb();
  const now = new Date().toISOString();
  
  const result = await db.execute(sql`
    SELECT mr.*, m.title as meeting_title, m.meeting_date, m.phase, m.objective, mc.name as channel_name
    FROM meeting_reminders_v2 mr
    LEFT JOIN meeting_records m ON mr.meeting_id = m.id
    LEFT JOIN meeting_channels mc ON mr.channel_id = mc.id
    WHERE mr.status = 'pending' AND mr.scheduled_at <= ${now}
    ORDER BY mr.scheduled_at ASC
    LIMIT 100
  `);
  
  return result[0] as any[];
}

export async function updateReminderStatus(reminderId: string, status: "sent" | "failed", error?: string) {
  const db = await requireDb();
  
  if (status === "sent") {
    await db.execute(sql`
      UPDATE meeting_reminders_v2 
      SET status = 'sent', sent_at = NOW()
      WHERE id = ${reminderId}
    `);
  } else {
    await db.execute(sql`
      UPDATE meeting_reminders_v2 
      SET status = 'failed', error = ${error || 'Unknown error'}
      WHERE id = ${reminderId}
    `);
  }
}

// ============================================================================
// Webhook Delivery
// ============================================================================

export async function sendWebhook(url: string, payload: WebhookPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GRT-Event": payload.event,
        "X-GRT-Timestamp": payload.timestamp,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function sendMeetingReminderWebhook(reminder: any): Promise<{ success: boolean; error?: string }> {
  if (!reminder.webhook_url) {
    return { success: false, error: "No webhook URL configured" };
  }
  
  const payload: WebhookPayload = {
    event: "meeting_reminder",
    meeting: {
      id: reminder.meeting_id,
      title: reminder.meeting_title,
      channelName: reminder.channel_name,
      meetingDate: reminder.meeting_date,
      phase: reminder.phase,
      objective: reminder.objective,
    },
    reminder: {
      minutesBefore: reminder.reminder_minutes,
      scheduledTime: reminder.scheduled_at,
    },
    timestamp: new Date().toISOString(),
  };
  
  return sendWebhook(reminder.webhook_url, payload);
}

// ============================================================================
// Meeting Event Notifications
// ============================================================================

export async function notifyMeetingCreated(meeting: {
  id: string;
  title: string;
  channelId: string;
  channelName: string;
  meetingDate: string;
  phase?: string;
  objective?: string;
}) {
  const webhookConfig = await getWebhookConfig(meeting.channelId);
  
  if (!webhookConfig || !webhookConfig.events?.includes("meeting_created")) {
    return { notified: false, reason: "No webhook configured for meeting_created event" };
  }
  
  const payload: WebhookPayload = {
    event: "meeting_created",
    meeting: {
      id: meeting.id,
      title: meeting.title,
      channelName: meeting.channelName,
      meetingDate: meeting.meetingDate,
      phase: meeting.phase,
      objective: meeting.objective,
    },
    timestamp: new Date().toISOString(),
  };
  
  const result = await sendWebhook(webhookConfig.webhook_url, payload);
  return { notified: result.success, error: result.error };
}

export async function notifyMeetingUpdated(meeting: {
  id: string;
  title: string;
  channelId: string;
  channelName: string;
  meetingDate: string;
  phase?: string;
  objective?: string;
}) {
  const webhookConfig = await getWebhookConfig(meeting.channelId);
  
  if (!webhookConfig || !webhookConfig.events?.includes("meeting_updated")) {
    return { notified: false, reason: "No webhook configured for meeting_updated event" };
  }
  
  const payload: WebhookPayload = {
    event: "meeting_updated",
    meeting: {
      id: meeting.id,
      title: meeting.title,
      channelName: meeting.channelName,
      meetingDate: meeting.meetingDate,
      phase: meeting.phase,
      objective: meeting.objective,
    },
    timestamp: new Date().toISOString(),
  };
  
  const result = await sendWebhook(webhookConfig.webhook_url, payload);
  return { notified: result.success, error: result.error };
}

// ============================================================================
// Reminder Processing Job
// ============================================================================

export async function processReminders(): Promise<{ processed: number; sent: number; failed: number }> {
  const pendingReminders = await getPendingReminders();
  let sent = 0;
  let failed = 0;
  
  for (const reminder of pendingReminders) {
    try {
      if (reminder.reminder_type === "webhook") {
        const result = await sendMeetingReminderWebhook(reminder);
        if (result.success) {
          await updateReminderStatus(reminder.id, "sent");
          sent++;
        } else {
          await updateReminderStatus(reminder.id, "failed", result.error);
          failed++;
        }
      } else if (reminder.reminder_type === "email") {
        // Email sending would be implemented here
        // For now, mark as sent (placeholder)
        await updateReminderStatus(reminder.id, "sent");
        sent++;
      } else if (reminder.reminder_type === "in_app") {
        // In-app notification would be implemented here
        await updateReminderStatus(reminder.id, "sent");
        sent++;
      }
    } catch (error) {
      log.error({ err: error, reminderId: reminder.id }, "Failed to process reminder");
      await updateReminderStatus(reminder.id, "failed", error instanceof Error ? error.message : "Unknown error");
      failed++;
    }
  }
  
  return { processed: pendingReminders.length, sent, failed };
}

log.info("Meeting reminder service loaded");
