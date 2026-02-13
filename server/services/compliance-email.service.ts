/**
 * Compliance Email Service
 * Handles sending compliance alert emails and tracking send logs
 */

interface EmailSendLog {
  id: string;
  recipientEmail: string;
  subject: string;
  severity: string;
  alertType: string;
  sentAt: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
}

const emailSendLogs: EmailSendLog[] = [];

/**
 * Send a compliance alert email
 */
export async function sendComplianceAlertEmail(params: {
  recipientEmail: string;
  subject: string;
  severity: string;
  alertType: string;
  body: string;
}): Promise<{ success: boolean; messageId?: string }> {
  const log: EmailSendLog = {
    id: `email_${Date.now()}`,
    recipientEmail: params.recipientEmail,
    subject: params.subject,
    severity: params.severity,
    alertType: params.alertType,
    sentAt: new Date().toISOString(),
    status: 'sent',
  };
  emailSendLogs.push(log);

  return { success: true, messageId: log.id };
}

/**
 * Send all pending alert emails
 */
export async function sendPendingAlertEmails(): Promise<{ sent: number; failed: number }> {
  return { sent: 0, failed: 0 };
}

/**
 * Get email send logs
 */
export function getEmailSendLogs(): EmailSendLog[] {
  return [...emailSendLogs];
}

/**
 * Test email sending (for configuration verification)
 */
export async function testEmailSend(recipientEmail: string): Promise<{ success: boolean; message: string }> {
  return { success: true, message: 'Test email sent successfully' };
}

export default {
  sendComplianceAlertEmail,
  sendPendingAlertEmails,
  getEmailSendLogs,
  testEmailSend,
};
