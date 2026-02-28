/**
 * Shared Zod Validators — reusable schemas for tRPC inputs
 *
 * Use these instead of z.any() to enforce type safety across all routers.
 */
import { z } from "zod";

// ── Pagination ──────────────────────────────────────────
export const paginationInput = z.object({
  limit: z.number().min(1).max(500).default(50),
  offset: z.number().min(0).default(0),
});

export const cursorPaginationInput = z.object({
  cursor: z.number().optional(),
  limit: z.number().min(1).max(200).default(20),
});

// ── ID fields ───────────────────────────────────────────
export const idInput = z.object({ id: z.number() });
export const stringIdInput = z.object({ id: z.string() });
export const optionalIdInput = z.object({ id: z.number().optional() });

// ── Contact fields ──────────────────────────────────────
export const emailSchema = z.string().email("Invalid email format").max(320);
export const phoneSchema = z.string().regex(/^[\d\-\+\s()]{6,20}$/, "Invalid phone number").optional();
export const urlSchema = z.string().url("Invalid URL").max(2048).optional();

// ── Date/Time ───────────────────────────────────────────
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format: YYYY-MM-DD");
export const monthStringSchema = z.string().regex(/^\d{4}-\d{2}$/, "Month format: YYYY-MM");
export const dateTimeSchema = z.string().datetime().optional();

// ── Text fields ─────────────────────────────────────────
export const nameSchema = z.string().min(1).max(200).trim();
export const titleSchema = z.string().min(1).max(500).trim();
export const descriptionSchema = z.string().max(5000).optional();
export const codeSchema = z.string().min(1).max(50).regex(/^[A-Za-z0-9_\-]+$/, "Only alphanumeric, hyphens, underscores");
export const longTextSchema = z.string().max(50000).optional();

// ── JSON blob fields ────────────────────────────────────
/** JSON-serializable value — use for JSON/JSONB column inputs instead of z.any() */
export const jsonValue = z.union([
  z.string(), z.number(), z.boolean(), z.null(),
  z.record(z.string(), z.unknown()),
  z.array(z.unknown()),
]);

// ── Numeric fields ──────────────────────────────────────
export const amountSchema = z.number().min(0).max(999999999);
export const percentSchema = z.number().min(0).max(100);
export const scoreSchema = z.number().min(0).max(100);
export const quantitySchema = z.number().int().min(0).max(999999);

// ── Status / Enum ───────────────────────────────────────
export const statusSchema = z.enum(["active", "inactive", "draft", "pending", "completed", "cancelled", "archived"]);
export const prioritySchema = z.enum(["P0", "P1", "P2", "P3"]);
export const severitySchema = z.enum(["info", "warning", "error", "critical"]);

// ── BU Scope ────────────────────────────────────────────
export const buCodeSchema = z.enum(["overseas", "commercial_vehicle", "passenger_vehicle", "semiconductor", "industrial_general"]).optional();

// ── Common CRUD input patterns ──────────────────────────
/** Generic list input with pagination + optional search */
export const listInput = z.object({
  limit: z.number().min(1).max(500).default(50),
  offset: z.number().min(0).default(0),
  search: z.string().max(200).optional(),
  status: z.string().max(30).optional(),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/** Generic date range filter */
export const dateRangeInput = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/** File attachment metadata */
export const attachmentSchema = z.object({
  fileName: z.string().max(500),
  fileUrl: z.string().max(2048),
  fileSize: z.number().optional(),
  mimeType: z.string().max(100).optional(),
});
