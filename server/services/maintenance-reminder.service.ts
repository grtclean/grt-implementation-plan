/**
 * Maintenance Reminder Service
 * Generates reminder messages for equipment maintenance via WeChat and DingTalk
 */

export interface MaintenanceReminder {
  equipmentId: number;
  serialNumber: string;
  modelName: string;
  clientId: number;
  clientName: string;
  clientTier: string;
  nextDueDate: string;
  daysUntilDue: number;
  reminderLevel: string;
}

export const REMINDER_CONFIG = {
  REMINDER_DAYS: [30, 14, 7, 3, 1] as number[],
  REMINDER_LEVELS: {
    30: "info",
    14: "warning",
    7: "urgent",
    3: "critical",
    1: "critical",
  } as Record<number, string>,
  TIER_PRIORITY: {
    Strategic: 1,
    Key: 2,
    Standard: 3,
  } as Record<string, number>,
};

export class MaintenanceReminderService {
  static generateWeChatMessage(reminders: MaintenanceReminder[]): string {
    if (reminders.length === 0) {
      return "暂无即将到期的设备维护计划";
    }

    const lines: string[] = [];
    lines.push("设备维护提醒");
    lines.push(`共有 ${reminders.length} 台设备需要关注：`);
    lines.push("");

    // Group by client
    const grouped = new Map<string, MaintenanceReminder[]>();
    for (const r of reminders) {
      const list = grouped.get(r.clientName) || [];
      list.push(r);
      grouped.set(r.clientName, list);
    }

    for (const [clientName, clientReminders] of grouped) {
      lines.push(`【${clientName}】`);
      for (const r of clientReminders) {
        if (r.daysUntilDue < 0) {
          lines.push(`  🔴 ${r.serialNumber} (${r.modelName}) - 已逾期${Math.abs(r.daysUntilDue)}天`);
        } else if (r.daysUntilDue <= 3) {
          lines.push(`  🟡 ${r.serialNumber} (${r.modelName}) - ${r.daysUntilDue}天后到期`);
        } else {
          lines.push(`  🟢 ${r.serialNumber} (${r.modelName}) - ${r.daysUntilDue}天后到期`);
        }
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  static generateDingTalkMessage(reminders: MaintenanceReminder[]): {
    msgtype: string;
    markdown?: { title: string; text: string };
    at?: { isAtAll: boolean };
  } {
    const hasCritical = reminders.some(
      (r) => r.reminderLevel === "critical" || r.daysUntilDue <= 3
    );

    const title = reminders.length === 0
      ? "设备维护提醒 - 暂无待处理"
      : `设备维护提醒 - ${reminders.length}台设备`;

    const text = reminders.length === 0
      ? "暂无即将到期的设备维护计划"
      : reminders
          .map(
            (r) =>
              `- **${r.serialNumber}** (${r.clientName}): ${r.daysUntilDue}天`
          )
          .join("\n");

    return {
      msgtype: "markdown",
      markdown: { title, text },
      ...(hasCritical ? { at: { isAtAll: true } } : {}),
    };
  }
}
