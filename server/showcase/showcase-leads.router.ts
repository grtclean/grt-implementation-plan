/**
 * Showcase CRM Lead Capture — Public endpoint for the GRT Cloud Showcase Portal.
 *
 * This is an Express router (not tRPC) because it must be publicly accessible
 * without authentication.  It simulates injecting lead data into the M0-CRM system.
 */

import { Router, json } from "express";
import { createLead } from "../crm/crm.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("showcase");

export const showcaseLeadsRouter = Router();

showcaseLeadsRouter.use(json());

/**
 * POST /api/crm/leads
 * Public lead capture endpoint for the Showcase Portal conversion form.
 */
showcaseLeadsRouter.post("/", async (req, res) => {
  try {
    const {
      companyName,
      contactName,
      email,
      phone,
      industry,
      requirements,
      source,
      timestamp,
    } = req.body;

    // Basic validation
    if (!companyName || !contactName || !email) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: companyName, contactName, email",
      });
    }

    // Inject into M0-CRM via the existing CRM service
    const lead = await createLead({
      companyName,
      contactName,
      contactEmail: email,
      contactPhone: phone || undefined,
      source: source || "showcase-portal",
      productInterest: industry
        ? `Showcase Portal — ${industry}`
        : "Showcase Portal",
      estimatedBudget: undefined,
      priority: "high",
      status: "new",
    });

    log.info({ companyName, email, industry }, "New lead captured");

    return res.json({
      success: true,
      leadId: lead.id,
      message: "Lead successfully injected into M0-CRM system.",
    });
  } catch (error: any) {
    log.error({ err: error }, "Lead capture error");
    return res.status(500).json({
      success: false,
      error: "Internal server error. Please try again.",
    });
  }
});
