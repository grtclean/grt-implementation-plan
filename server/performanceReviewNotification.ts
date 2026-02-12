/**
 * 述职提醒邮件发送服务
 * 
 * 功能：
 * 1. 检查即将到期的述职提醒
 * 2. 生成邮件内容
 * 3. 发送通知给相关人员
 * 4. 记录发送日志
 */

import { requireDb } from './utils/db-helpers';
import { hrmPerformanceReviewReminders, performanceReviewEmailLogs, hrmEmployees } from "../drizzle/schema";
import { eq, and, lte, gte, isNull } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// 固定收件人列表
const FIXED_RECIPIENTS = [
  "camillia@gerrytech.com",
  "gerry@grtclean.ai"
];

// 生成述职提醒邮件内容
function generateEmailContent(
  employeeName: string,
  reviewType: string,
  reviewDate: Date,
  department: string
): { subject: string; content: string } {
  const reviewTypeLabel = reviewType === "3M" ? "3个月试用期" : reviewType === "6M" ? "6个月试用期" : "年度述职";
  const formattedDate = reviewDate.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = `【述职提醒】${employeeName} - ${reviewTypeLabel}述职报告`;
  
  const content = `
## 述职报告提醒

**员工姓名**: ${employeeName}
**所属部门**: ${department}
**述职类型**: ${reviewTypeLabel}
**述职日期**: ${formattedDate}

---

### 提醒事项

1. 请提前准备述职报告材料
2. 述职时间：周二下午2:00
3. 述职地点：会议室（待定）

### 述职报告要求

- 试用期工作总结
- 主要工作成果
- 遇到的问题及解决方案
- 下一阶段工作计划
- 个人发展建议

---

此邮件由GRT智能系统自动发送，请勿直接回复。
如有疑问，请联系HR部门。
  `.trim();

  return { subject, content };
}

// 检查并发送即将到期的述职提醒
export async function checkAndSendPerformanceReviewReminders(): Promise<{
  checked: number;
  sent: number;
  failed: number;
  details: Array<{ employeeName: string; status: string; error?: string }>;
}> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 查找即将到期且未发送的提醒
  const pendingReminders = await db
    .select({
      reminder: hrmPerformanceReviewReminders,
      employee: hrmEmployees,
    })
    .from(hrmPerformanceReviewReminders)
    .innerJoin(hrmEmployees, eq(hrmPerformanceReviewReminders.employeeId, hrmEmployees.id))
    .where(
      and(
        eq(hrmPerformanceReviewReminders.status, "pending"),
        lte(hrmPerformanceReviewReminders.reviewDate, oneWeekLater.toISOString()),
        gte(hrmPerformanceReviewReminders.reviewDate, now.toISOString())
      )
    );

  const results = {
    checked: pendingReminders.length,
    sent: 0,
    failed: 0,
    details: [] as Array<{ employeeName: string; status: string; error?: string }>,
  };

  for (const { reminder, employee } of pendingReminders) {
    try {
      // 生成邮件内容
      const { subject, content } = generateEmailContent(
        employee.name,
        reminder.reviewType,
        new Date(reminder.reviewDate),
        employee.department || "未分配"
      );

      // 创建邮件日志记录
      const [emailLog] = await db
        .insert(performanceReviewEmailLogs)
        .values({
          reminderId: reminder.id,
          employeeId: employee.id,
          emailSubject: subject,
          emailContent: content,
          recipients: JSON.stringify(FIXED_RECIPIENTS),
          sendStatus: "pending",
        })
        .returning();

      // 发送通知
      const notificationSent = await notifyOwner({
        title: subject,
        content: content,
      });

      if (notificationSent) {
        // 更新邮件日志状态
        await db
          .update(performanceReviewEmailLogs)
          .set({
            sendStatus: "sent",
            sentAt: new Date().toISOString(),
          })
          .where(eq(performanceReviewEmailLogs.id, emailLog.id));

        // 更新提醒状态
        await db
          .update(hrmPerformanceReviewReminders)
          .set({
            status: "sent",
            sentAt: new Date().toISOString(),
          })
          .where(eq(hrmPerformanceReviewReminders.id, reminder.id));

        results.sent++;
        results.details.push({
          employeeName: employee.name,
          status: "sent",
        });
      } else {
        // 更新邮件日志状态为失败
        await db
          .update(performanceReviewEmailLogs)
          .set({
            sendStatus: "failed",
            errorMessage: "Notification service returned false",
            retryCount: 1,
          })
          .where(eq(performanceReviewEmailLogs.id, emailLog.id));

        results.failed++;
        results.details.push({
          employeeName: employee.name,
          status: "failed",
          error: "Notification service unavailable",
        });
      }
    } catch (error) {
      results.failed++;
      results.details.push({
        employeeName: employee.name,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

// 手动触发发送特定员工的述职提醒
export async function sendPerformanceReviewReminderForEmployee(
  employeeId: number,
  reviewType: "3M" | "6M" | "YEAR"
): Promise<{ success: boolean; message: string }> {
  const db = await requireDb();
  if (!db) return { success: false, message: "数据库不可用" };

  // 查找员工和提醒
  const [employee] = await db
    .select()
    .from(hrmEmployees)
    .where(eq(hrmEmployees.id, employeeId));

  if (!employee) {
    return { success: false, message: "员工不存在" };
  }

  const [reminder] = await db
    .select()
    .from(hrmPerformanceReviewReminders)
    .where(
      and(
        eq(hrmPerformanceReviewReminders.employeeId, employeeId),
        eq(hrmPerformanceReviewReminders.reviewType, reviewType)
      )
    );

  if (!reminder) {
    return { success: false, message: "未找到对应的述职提醒配置" };
  }

  // 生成并发送邮件
  const { subject, content } = generateEmailContent(
    employee.name,
    reviewType,
    new Date(reminder.reviewDate),
    employee.department || "未分配"
  );

  // 创建邮件日志
  const [emailLog] = await db
    .insert(performanceReviewEmailLogs)
    .values({
      reminderId: reminder.id,
      employeeId: employee.id,
      emailSubject: subject,
      emailContent: content,
      recipients: JSON.stringify(FIXED_RECIPIENTS),
      sendStatus: "pending",
    })
    .returning();

  try {
    const notificationSent = await notifyOwner({
      title: subject,
      content: content,
    });

    if (notificationSent) {
      await db
        .update(performanceReviewEmailLogs)
        .set({
          sendStatus: "sent",
          sentAt: new Date().toISOString(),
        })
        .where(eq(performanceReviewEmailLogs.id, emailLog.id));

      return { success: true, message: `已成功发送${employee.name}的${reviewType === "3M" ? "3个月" : reviewType === "6M" ? "6个月" : "年度"}述职提醒` };
    } else {
      await db
        .update(performanceReviewEmailLogs)
        .set({
          sendStatus: "failed",
          errorMessage: "Notification service unavailable",
        })
        .where(eq(performanceReviewEmailLogs.id, emailLog.id));

      return { success: false, message: "通知服务暂时不可用" };
    }
  } catch (error) {
    await db
      .update(performanceReviewEmailLogs)
      .set({
        sendStatus: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(performanceReviewEmailLogs.id, emailLog.id));

    return { success: false, message: error instanceof Error ? error.message : "发送失败" };
  }
}
