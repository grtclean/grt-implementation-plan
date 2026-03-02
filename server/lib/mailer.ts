/**
 * Office 365 Encrypted Email Ferry — SMTP Transport
 *
 * Configures nodemailer to send via Microsoft Office 365 SMTP relay.
 * Used for cross-border data synchronisation between the US Global Hub
 * and the China On-Premise Hub.
 *
 * Security posture:
 *   - TLS 1.2+ enforced (requireTLS: true)
 *   - Credentials sourced from environment variables (never hardcoded)
 *   - All payloads must pass through the desensitizer before dispatch
 *
 * Environment variables:
 *   O365_USER  — Office 365 sender email (e.g. sync-bot@gerrytech.com)
 *   O365_PASS  — App password or OAuth token
 */
import nodemailer from "nodemailer";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("mailer");

// ── Transport configuration ────────────────────────────────
// Points to Office 365 SMTP endpoint with mandatory TLS encryption.
// In production, O365_USER and O365_PASS come from a vault / env secret.
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false, // STARTTLS on port 587 (not implicit TLS 465)
  requireTLS: true, // Abort if STARTTLS handshake fails
  auth: {
    user: process.env.O365_USER || "sync-bot@gerrytech.com",
    pass: process.env.O365_PASS || "mock-password-not-real",
  },
  tls: {
    // Minimum TLS 1.2 for compliance with cross-border data regulations
    minVersion: "TLSv1.2",
    ciphers: "HIGH:!aNULL:!MD5",
  },
});

// ── Types ──────────────────────────────────────────────────
export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated: boolean; // true when O365 credentials are not configured
}

// ── Send function ──────────────────────────────────────────
/**
 * sendSecureMail — Dispatches an encrypted email via O365 SMTP.
 *
 * If O365_USER / O365_PASS are not set (dev/demo mode), the function
 * simulates the send and returns a mock messageId so the UI still works.
 */
export async function sendSecureMail(
  options: SendMailOptions
): Promise<SendMailResult> {
  const from = process.env.O365_USER || "sync-bot@gerrytech.com";
  const isConfigured =
    process.env.O365_USER && process.env.O365_PASS;

  // ── Production path: actually send via O365 ──
  if (isConfigured) {
    try {
      const info = await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.body,
        attachments: options.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType || "application/json",
        })),
      });
      return { success: true, messageId: info.messageId, simulated: false };
    } catch (err: any) {
      log.error({ err }, "Send failed");
      return { success: false, error: err?.message, simulated: false };
    }
  }

  // ── Dev/demo path: simulate the send ──
  const mockId = `<mock-${Date.now()}@gerrytech.com>`;

  return { success: true, messageId: mockId, simulated: true };
}
