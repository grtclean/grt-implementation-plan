/**
 * Barcode Management Router — 条码管理
 *
 * QR/CODE128/EAN13 barcode generation, lookup, and batch operations.
 * Links barcodes to materials and lot numbers for traceability.
 *
 * 8 procedures:
 *   create, list, get, update, delete, lookup, bulkCreate, getStats
 */
import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("barcode");

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) =>
  typeof id === "string" ? parseInt(id) : id;

// ─── Auto-DDL ──────────────────────────────────────────────────
let tablesEnsured = false;
async function ensureTables() {
  if (tablesEnsured) return;
  const db = await requireDb();
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "barcodes" (
        "id" serial PRIMARY KEY NOT NULL,
        "content" varchar(500) NOT NULL,
        "format" varchar(20) DEFAULT 'QR',
        "label" varchar(200),
        "material_code" varchar(50),
        "lot_number" varchar(50),
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "barcodes_content_idx" ON "barcodes" ("content")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "barcodes_material_code_idx" ON "barcodes" ("material_code")`);
    tablesEnsured = true;
    log.info("barcodes table ensured");
  } catch (e) {
    log.error({ err: e }, "Failed to ensure barcodes table");
  }
}

// ─── Router ────────────────────────────────────────────────────
export const barcodeRouter = router({
  create: requirePermission("mfg:process:manage")
    .input(
      z.object({
        content: z.string().min(1).max(500),
        format: z.enum(["QR", "CODE128", "EAN13"]).default("QR"),
        label: z.string().max(200).optional(),
        materialCode: z.string().max(50).optional(),
        lotNumber: z.string().max(50).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const userId = (ctx as any).session?.userId ?? null;
      const rows = await db.execute(sql`
        INSERT INTO "barcodes" ("content", "format", "label", "material_code", "lot_number", "created_by")
        VALUES (${input.content}, ${input.format}, ${input.label ?? null}, ${input.materialCode ?? null}, ${input.lotNumber ?? null}, ${userId})
        RETURNING *
      `);
      log.info({ content: input.content, format: input.format }, "Barcode created");
      return rows.rows[0];
    }),

  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        format: z.enum(["QR", "CODE128", "EAN13"]).optional(),
        limit: z.number().int().min(1).max(200).default(50),
      }).optional(),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const limit = input?.limit ?? 50;
      const search = input?.search;
      const format = input?.format;

      if (search && format) {
        const rows = await db.execute(sql`
          SELECT * FROM "barcodes"
          WHERE ("content" ILIKE ${'%' + search + '%'} OR "label" ILIKE ${'%' + search + '%'} OR "material_code" ILIKE ${'%' + search + '%'})
            AND "format" = ${format}
          ORDER BY "id" DESC LIMIT ${limit}
        `);
        return rows.rows;
      }
      if (search) {
        const rows = await db.execute(sql`
          SELECT * FROM "barcodes"
          WHERE "content" ILIKE ${'%' + search + '%'} OR "label" ILIKE ${'%' + search + '%'} OR "material_code" ILIKE ${'%' + search + '%'}
          ORDER BY "id" DESC LIMIT ${limit}
        `);
        return rows.rows;
      }
      if (format) {
        const rows = await db.execute(sql`
          SELECT * FROM "barcodes" WHERE "format" = ${format}
          ORDER BY "id" DESC LIMIT ${limit}
        `);
        return rows.rows;
      }
      const rows = await db.execute(sql`
        SELECT * FROM "barcodes" ORDER BY "id" DESC LIMIT ${limit}
      `);
      return rows.rows;
    }),

  get: protectedProcedure
    .input(idInput)
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.execute(sql`
        SELECT * FROM "barcodes" WHERE "id" = ${toNum(input.id)} LIMIT 1
      `);
      return rows.rows[0] ?? null;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        label: z.string().max(200).optional(),
        materialCode: z.string().max(50).optional(),
        lotNumber: z.string().max(50).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = toNum(input.id);
      const rows = await db.execute(sql`
        UPDATE "barcodes"
        SET "label" = COALESCE(${input.label ?? null}, "label"),
            "material_code" = COALESCE(${input.materialCode ?? null}, "material_code"),
            "lot_number" = COALESCE(${input.lotNumber ?? null}, "lot_number")
        WHERE "id" = ${id}
        RETURNING *
      `);
      log.info({ id }, "Barcode updated");
      return rows.rows[0] ?? null;
    }),

  delete: requirePermission("mfg:process:manage")
    .input(idInput)
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = toNum(input.id);
      await db.execute(sql`DELETE FROM "barcodes" WHERE "id" = ${id}`);
      log.info({ id }, "Barcode deleted");
      return { success: true };
    }),

  lookup: protectedProcedure
    .input(z.object({ content: z.string().min(1) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.execute(sql`
        SELECT * FROM "barcodes" WHERE "content" = ${input.content} LIMIT 1
      `);
      return rows.rows[0] ?? null;
    }),

  bulkCreate: requirePermission("mfg:process:manage")
    .input(
      z.object({
        items: z.array(
          z.object({
            content: z.string().min(1).max(500),
            format: z.enum(["QR", "CODE128", "EAN13"]).default("QR"),
            label: z.string().max(200).optional(),
          }),
        ).min(1).max(500),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const userId = (ctx as any).session?.userId ?? null;
      const inserted: any[] = [];
      for (const item of input.items) {
        const rows = await db.execute(sql`
          INSERT INTO "barcodes" ("content", "format", "label", "created_by")
          VALUES (${item.content}, ${item.format}, ${item.label ?? null}, ${userId})
          RETURNING *
        `);
        inserted.push(rows.rows[0]);
      }
      log.info({ count: inserted.length }, "Bulk barcodes created");
      return { inserted: inserted.length, items: inserted };
    }),

  getStats: protectedProcedure
    .query(async () => {
      await ensureTables();
      const db = await requireDb();
      const byFormat = await db.execute(sql`
        SELECT "format", COUNT(*)::int AS "count" FROM "barcodes" GROUP BY "format" ORDER BY "count" DESC
      `);
      const total = await db.execute(sql`
        SELECT COUNT(*)::int AS "total" FROM "barcodes"
      `);
      const today = await db.execute(sql`
        SELECT COUNT(*)::int AS "today" FROM "barcodes" WHERE "created_at" >= CURRENT_DATE
      `);
      return {
        byFormat: byFormat.rows,
        total: (total.rows[0] as any)?.total ?? 0,
        today: (today.rows[0] as any)?.today ?? 0,
      };
    }),
});
