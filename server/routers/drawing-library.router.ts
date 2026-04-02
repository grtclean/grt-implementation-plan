/**
 * Drawing Library Router — 图纸库/BDO图纸管理
 *
 * Full CRUD + status lifecycle + revision tracking + relation management.
 * Tables auto-created via ensureTables() DDL on first access.
 *
 * 13 procedures:
 *   list, getById, create, update, changeStatus,
 *   getRevisions, createRevision,
 *   addRelation, removeRelation, getRelations,
 *   getByProduct, getStats, search
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import {
  drawings,
  drawingRevisions,
  drawingRelations,
} from "../../drizzle/drawing-schema";
import { eq, desc, and, sql, count, like, or, type SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("drawing-library");

// ── Auto-DDL ────────────────────────────────────────────────
let tablesEnsured = false;
async function ensureTables() {
  if (tablesEnsured) return;
  const db = await requireDb();
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "drawings" (
        "id" serial PRIMARY KEY NOT NULL,
        "drawing_number" varchar(100) NOT NULL UNIQUE,
        "title" varchar(300) NOT NULL,
        "description" text,
        "drawing_type" varchar(30) NOT NULL,
        "file_format" varchar(20),
        "version" varchar(20) NOT NULL DEFAULT 'A.1',
        "revision" integer DEFAULT 1,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "product_id" integer,
        "product_code" varchar(50),
        "project_number" varchar(50),
        "designer" varchar(100),
        "reviewer" varchar(100),
        "approver" varchar(100),
        "approved_at" timestamp,
        "released_at" timestamp,
        "file_url" text,
        "file_size_kb" integer,
        "thumbnail_url" text,
        "tags" jsonb DEFAULT '[]'::jsonb,
        "metadata" jsonb DEFAULT '{}'::jsonb,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "drawings_product_id_idx" ON "drawings" ("product_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "drawings_product_code_idx" ON "drawings" ("product_code")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "drawings_status_idx" ON "drawings" ("status")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "drawings_drawing_type_idx" ON "drawings" ("drawing_type")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "drawings_created_at_idx" ON "drawings" ("created_at")`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "drawing_revisions" (
        "id" serial PRIMARY KEY NOT NULL,
        "drawing_id" integer NOT NULL,
        "version" varchar(20) NOT NULL,
        "revision" integer NOT NULL,
        "change_description" text,
        "changed_by" varchar(100),
        "file_url" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "drawing_revisions_drawing_id_idx" ON "drawing_revisions" ("drawing_id")`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "drawing_relations" (
        "id" serial PRIMARY KEY NOT NULL,
        "drawing_id" integer NOT NULL,
        "relation_type" varchar(30) NOT NULL,
        "related_entity_id" integer,
        "related_entity_code" varchar(100),
        "notes" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "drawing_relations_drawing_id_idx" ON "drawing_relations" ("drawing_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "drawing_relations_relation_type_idx" ON "drawing_relations" ("relation_type")`);

    tablesEnsured = true;
    log.info("Drawing library tables ensured");
  } catch (err) {
    log.error({ err }, "Failed to ensure drawing library tables");
    throw err;
  }
}

// ── Valid enums ─────────────────────────────────────────────
const DRAWING_TYPES = [
  "mechanical", "electrical", "pneumatic", "hydraulic",
  "piping", "assembly", "detail", "layout", "schematic", "wiring", "eplan",
] as const;

const STATUSES = ["draft", "in_review", "approved", "released", "obsolete"] as const;

const RELATION_TYPES = [
  "bom_item", "project", "ecr", "eco", "requirement", "parent_assembly",
] as const;

// ── Status transition map ───────────────────────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["in_review", "obsolete"],
  in_review: ["approved", "draft", "obsolete"],
  approved: ["released", "obsolete"],
  released: ["obsolete"],
  obsolete: [],
};

// ── Router ──────────────────────────────────────────────────
export const drawingLibraryRouter = router({
  /**
   * list — paginated listing with filters
   */
  list: protectedProcedure
    .input(
      z.object({
        drawingType: z.enum(DRAWING_TYPES).optional(),
        status: z.enum(STATUSES).optional(),
        productCode: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conditions: SQL[] = [];

      if (input.drawingType) {
        conditions.push(eq(drawings.drawingType, input.drawingType));
      }
      if (input.status) {
        conditions.push(eq(drawings.status, input.status));
      }
      if (input.productCode) {
        conditions.push(eq(drawings.productCode, input.productCode));
      }
      if (input.search) {
        const pattern = `%${input.search}%`;
        conditions.push(
          or(
            like(drawings.drawingNumber, pattern),
            like(drawings.title, pattern),
          )!,
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, totalResult] = await Promise.all([
        db
          .select()
          .from(drawings)
          .where(where)
          .orderBy(desc(drawings.updatedAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: count() }).from(drawings).where(where),
      ]);

      return { items, total: totalResult[0]?.count ?? 0 };
    }),

  /**
   * getById — single drawing
   */
  getById: protectedProcedure
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);
      const rows = await db.select().from(drawings).where(eq(drawings.id, id)).limit(1);
      if (!rows[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Drawing ${id} not found` });
      }
      return rows[0];
    }),

  /**
   * create — insert new drawing
   */
  create: protectedProcedure
    .input(
      z.object({
        drawingNumber: z.string().min(1).max(100),
        title: z.string().min(1).max(300),
        description: z.string().optional(),
        drawingType: z.enum(DRAWING_TYPES),
        fileFormat: z.string().max(20).optional(),
        version: z.string().max(20).default("A.1"),
        revision: z.number().int().default(1),
        status: z.enum(STATUSES).default("draft"),
        productId: z.number().int().optional(),
        productCode: z.string().max(50).optional(),
        projectNumber: z.string().max(50).optional(),
        designer: z.string().max(100).optional(),
        reviewer: z.string().max(100).optional(),
        approver: z.string().max(100).optional(),
        fileUrl: z.string().optional(),
        fileSizeKb: z.number().int().optional(),
        thumbnailUrl: z.string().optional(),
        tags: z.array(z.string()).default([]),
        metadata: z.record(z.string(), z.any()).default({}),
        createdBy: z.number().int().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      log.info({ drawingNumber: input.drawingNumber }, "Creating drawing");

      const rows = await db.insert(drawings).values({
        drawingNumber: input.drawingNumber,
        title: input.title,
        description: input.description,
        drawingType: input.drawingType,
        fileFormat: input.fileFormat,
        version: input.version,
        revision: input.revision,
        status: input.status,
        productId: input.productId,
        productCode: input.productCode,
        projectNumber: input.projectNumber,
        designer: input.designer,
        reviewer: input.reviewer,
        approver: input.approver,
        fileUrl: input.fileUrl,
        fileSizeKb: input.fileSizeKb,
        thumbnailUrl: input.thumbnailUrl,
        tags: input.tags,
        metadata: input.metadata,
        createdBy: input.createdBy,
      }).returning();

      return rows[0];
    }),

  /**
   * update — update fields, auto-increment revision, auto-update updatedAt
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        title: z.string().max(300).optional(),
        description: z.string().optional(),
        drawingType: z.enum(DRAWING_TYPES).optional(),
        fileFormat: z.string().max(20).optional(),
        version: z.string().max(20).optional(),
        productId: z.number().int().optional(),
        productCode: z.string().max(50).optional(),
        projectNumber: z.string().max(50).optional(),
        designer: z.string().max(100).optional(),
        reviewer: z.string().max(100).optional(),
        approver: z.string().max(100).optional(),
        fileUrl: z.string().optional(),
        fileSizeKb: z.number().int().optional(),
        thumbnailUrl: z.string().optional(),
        tags: z.array(z.string()).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);

      // Fetch current to check existence
      const existing = await db.select().from(drawings).where(eq(drawings.id, id)).limit(1);
      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Drawing ${id} not found` });
      }

      const { id: _id, ...updates } = input;
      const setValues: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          setValues[key] = value;
        }
      }

      // Auto-increment revision and updatedAt
      const newRevision = (existing[0].revision ?? 0) + 1;

      log.info({ id, newRevision }, "Updating drawing");

      const rows = await db
        .update(drawings)
        .set({
          ...setValues,
          revision: newRevision,
          updatedAt: new Date(),
        })
        .where(eq(drawings.id, id))
        .returning();

      return rows[0];
    }),

  /**
   * changeStatus — transition status with guard
   */
  changeStatus: protectedProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        newStatus: z.enum(STATUSES),
        approver: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);

      const existing = await db.select().from(drawings).where(eq(drawings.id, id)).limit(1);
      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Drawing ${id} not found` });
      }

      const currentStatus = existing[0].status;
      const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
      if (!allowed.includes(input.newStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from "${currentStatus}" to "${input.newStatus}". Allowed: ${allowed.join(", ") || "none"}`,
        });
      }

      const setValues: Record<string, unknown> = {
        status: input.newStatus,
        updatedAt: new Date(),
      };

      if (input.newStatus === "approved") {
        setValues.approvedAt = new Date();
        if (input.approver) setValues.approver = input.approver;
      }
      if (input.newStatus === "released") {
        setValues.releasedAt = new Date();
      }

      log.info({ id, from: currentStatus, to: input.newStatus }, "Changing drawing status");

      const rows = await db
        .update(drawings)
        .set(setValues)
        .where(eq(drawings.id, id))
        .returning();

      return rows[0];
    }),

  /**
   * getRevisions — revision history for a drawing
   */
  getRevisions: protectedProcedure
    .input(z.object({ drawingId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const drawingId = Number(input.drawingId);
      return db
        .select()
        .from(drawingRevisions)
        .where(eq(drawingRevisions.drawingId, drawingId))
        .orderBy(desc(drawingRevisions.createdAt))
        .limit(200);
    }),

  /**
   * createRevision — add a revision entry
   */
  createRevision: protectedProcedure
    .input(
      z.object({
        drawingId: z.union([z.string(), z.number()]),
        version: z.string().max(20),
        revision: z.number().int(),
        changeDescription: z.string().optional(),
        changedBy: z.string().max(100).optional(),
        fileUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const drawingId = Number(input.drawingId);

      log.info({ drawingId, version: input.version, revision: input.revision }, "Creating drawing revision");

      const rows = await db.insert(drawingRevisions).values({
        drawingId,
        version: input.version,
        revision: input.revision,
        changeDescription: input.changeDescription,
        changedBy: input.changedBy,
        fileUrl: input.fileUrl,
      }).returning();

      return rows[0];
    }),

  /**
   * addRelation — link drawing to another entity
   */
  addRelation: protectedProcedure
    .input(
      z.object({
        drawingId: z.union([z.string(), z.number()]),
        relationType: z.enum(RELATION_TYPES),
        relatedEntityId: z.number().int().optional(),
        relatedEntityCode: z.string().max(100).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const drawingId = Number(input.drawingId);

      log.info({ drawingId, relationType: input.relationType }, "Adding drawing relation");

      const rows = await db.insert(drawingRelations).values({
        drawingId,
        relationType: input.relationType,
        relatedEntityId: input.relatedEntityId,
        relatedEntityCode: input.relatedEntityCode,
        notes: input.notes,
      }).returning();

      return rows[0];
    }),

  /**
   * removeRelation — unlink
   */
  removeRelation: protectedProcedure
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);

      const rows = await db
        .delete(drawingRelations)
        .where(eq(drawingRelations.id, id))
        .returning();

      if (!rows[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Relation ${id} not found` });
      }

      log.info({ id }, "Removed drawing relation");
      return { success: true };
    }),

  /**
   * getRelations — list relations for a drawing
   */
  getRelations: protectedProcedure
    .input(
      z.object({
        drawingId: z.union([z.string(), z.number()]),
        relationType: z.enum(RELATION_TYPES).optional(),
      }),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const drawingId = Number(input.drawingId);
      const conditions: SQL[] = [eq(drawingRelations.drawingId, drawingId)];

      if (input.relationType) {
        conditions.push(eq(drawingRelations.relationType, input.relationType));
      }

      return db
        .select()
        .from(drawingRelations)
        .where(and(...conditions))
        .orderBy(desc(drawingRelations.createdAt))
        .limit(200);
    }),

  /**
   * getByProduct — list drawings for a productCode
   */
  getByProduct: protectedProcedure
    .input(
      z.object({
        productCode: z.string(),
        limit: z.number().min(1).max(200).default(50),
      }),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      return db
        .select()
        .from(drawings)
        .where(eq(drawings.productCode, input.productCode))
        .orderBy(desc(drawings.updatedAt))
        .limit(input.limit);
    }),

  /**
   * getStats — count by type, status, recent activity
   */
  getStats: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();

    const [byType, byStatus, totalResult, recentResult] = await Promise.all([
      db
        .select({
          drawingType: drawings.drawingType,
          count: count(),
        })
        .from(drawings)
        .groupBy(drawings.drawingType),
      db
        .select({
          status: drawings.status,
          count: count(),
        })
        .from(drawings)
        .groupBy(drawings.status),
      db.select({ count: count() }).from(drawings),
      db
        .select({ count: count() })
        .from(drawings)
        .where(sql`"created_at" > now() - interval '30 days'`),
    ]);

    return {
      total: totalResult[0]?.count ?? 0,
      recentMonth: recentResult[0]?.count ?? 0,
      byType,
      byStatus,
    };
  }),

  /**
   * search — full-text search on drawingNumber, title, tags
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const pattern = `%${input.query}%`;

      return db
        .select()
        .from(drawings)
        .where(
          or(
            like(drawings.drawingNumber, pattern),
            like(drawings.title, pattern),
            sql`"tags"::text ILIKE ${pattern}`,
          ),
        )
        .orderBy(desc(drawings.updatedAt))
        .limit(input.limit);
    }),
});
