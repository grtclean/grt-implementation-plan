/**
 * Payment Term Checker Service
 *
 * Scheduled task: queries payment_workflows where paymentDueDate <= NOW()
 * and automatically marks paymentTermExpired = true,
 * advancing the workflow step if still at payment_term_check.
 */
import { requireDb } from "../db";
import { paymentWorkflows } from "../../drizzle/p2p-lifecycle-schema";
import { eq } from "drizzle-orm";

export interface PaymentTermCheckResult {
  checked: number;
  expired: number;
  alreadyExpired: number;
  errors: string[];
}

/**
 * Main check — call from a cron job (e.g. daily at 8:00 AM).
 *
 * For each in-progress payment workflow:
 * 1. If paymentDueDate <= today and paymentTermExpired is false → mark expired
 * 2. If currentStep is still "payment_term_check" → advance to "quality_feedback_ok"
 */
export async function runPaymentTermCheck(): Promise<PaymentTermCheckResult> {
  const result: PaymentTermCheckResult = {
    checked: 0,
    expired: 0,
    alreadyExpired: 0,
    errors: [],
  };

  try {
    const db = await requireDb();
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    // Get all in-progress workflows
    const workflows = await db.select().from(paymentWorkflows);
    const active = workflows.filter(w => w.status === "in_progress" || w.status === "pending");
    result.checked = active.length;

    for (const wf of active) {
      if (!wf.paymentDueDate) continue;

      if (wf.paymentTermExpired) {
        result.alreadyExpired++;
        continue;
      }

      // Compare dates
      if (wf.paymentDueDate <= today) {
        try {
          const updates: Record<string, any> = {
            paymentTermExpired: true,
            updatedAt: now,
          };
          // Auto-advance step if still on payment_term_check
          if (wf.currentStep === "payment_term_check") {
            updates.currentStep = "quality_feedback_ok";
          }
          await db.update(paymentWorkflows)
            .set(updates)
            .where(eq(paymentWorkflows.id, wf.id));
          result.expired++;
        } catch (err: any) {
          result.errors.push(`Workflow ${wf.workflowCode}: ${err.message}`);
        }
      }
    }
  } catch (err: any) {
    result.errors.push(`Service error: ${err.message}`);
  }

  return result;
}

/**
 * Get upcoming payment due dates for dashboard display.
 * Returns workflows due within the next N days.
 */
export async function getUpcomingPaymentDueDates(withinDays = 7) {
  try {
    const db = await requireDb();
    const today = new Date();
    const futureDate = new Date(today.getTime() + withinDays * 86400000).toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    const workflows = await db.select().from(paymentWorkflows);
    const upcoming = workflows.filter(w =>
      w.paymentDueDate &&
      w.paymentDueDate >= todayStr &&
      w.paymentDueDate <= futureDate &&
      (w.status === "in_progress" || w.status === "pending")
    );

    return upcoming.map(w => ({
      id: w.id,
      workflowCode: w.workflowCode,
      supplierName: w.supplierName,
      paymentAmount: w.paymentAmount,
      paymentDueDate: w.paymentDueDate,
      currentStep: w.currentStep,
      daysUntilDue: Math.ceil(
        (new Date(w.paymentDueDate!).getTime() - today.getTime()) / 86400000
      ),
    }));
  } catch {
    return [];
  }
}
