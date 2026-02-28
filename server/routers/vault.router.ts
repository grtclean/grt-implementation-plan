/**
 * GRT Cloud Vault — tRPC Router
 * File management, version check-in, and Engineering Change Order workflows
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import {
  grtVaultFiles,
  engineeringChangeOrders,
} from "../../drizzle/digital-thread-schema";
import { eq, and, desc, count } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const vaultRouter = router({

  // ══════════════════════════════════════════════════
  // Vault Files
  // ══════════════════════════════════════════════════

  /** List vault files by projectId with optional fileType filter */
  list: protectedProcedure.input(z.object({
    projectId: z.union([z.string(), z.number()]),
    fileType: z.enum(["SOLIDWORKS", "EPLAN", "WORD", "PDF", "EMAIL_EML", "MEETING_RECORD"]).optional(),
    limit: z.number().default(50),
    offset: z.number().default(0),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const conditions = [
      eq(grtVaultFiles.projectId, toNum(input.projectId)),
    ];

    if (input.fileType) {
      conditions.push(eq(grtVaultFiles.fileType, input.fileType as any));
    }

    const where = and(...conditions);

    const [items, [{ value: total }]] = await Promise.all([
      db.select().from(grtVaultFiles)
        .where(where)
        .orderBy(desc(grtVaultFiles.updatedAt))
        .limit(input.limit)
        .offset(input.offset),
      db.select({ value: count() }).from(grtVaultFiles).where(where),
    ]);

    return { items, total: Number(total) };
  }),

  /** Get single vault file by ID */
  getById: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [file] = await db.select().from(grtVaultFiles)
      .where(eq(grtVaultFiles.id, toNum(input.id)));
    return file ?? null;
  }),

  /** Mock upload — inserts file record */
  upload: protectedProcedure.input(z.object({
    projectId: z.union([z.string(), z.number()]),
    fileName: z.string().min(1),
    fileType: z.enum(["SOLIDWORKS", "EPLAN", "WORD", "PDF", "EMAIL_EML", "MEETING_RECORD"]),
    uploadedBy: z.string().min(1),
    size: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();

    const [inserted] = await db.insert(grtVaultFiles).values({
      projectId: toNum(input.projectId),
      fileName: input.fileName,
      fileType: input.fileType,
      version: 1,
      // uploadedBy is integer in schema — store 0 as placeholder since we receive a string name
      uploadedBy: 0,
      fileSizeBytes: input.size ?? null,
    } as any).returning();

    return inserted;
  }),

  /** Mock version bump — increments integer version */
  checkin: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const [file] = await db.select().from(grtVaultFiles)
      .where(eq(grtVaultFiles.id, toNum(input.id)));

    if (!file) throw new Error(`Vault file not found: id=${input.id}`);

    // version is integer in schema
    const currentVersion = typeof file.version === "number" ? file.version : 1;
    const newVersion = currentVersion + 1;

    const [updated] = await db.update(grtVaultFiles)
      .set({ version: newVersion, updatedAt: new Date().toISOString() })
      .where(eq(grtVaultFiles.id, toNum(input.id)))
      .returning();

    return updated;
  }),

  // ══════════════════════════════════════════════════
  // Engineering Change Orders
  // ══════════════════════════════════════════════════

  /** List ECOs by projectId */
  listEcos: protectedProcedure.input(z.object({
    projectId: z.union([z.string(), z.number()]),
    limit: z.number().default(50),
    offset: z.number().default(0),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const where = eq(engineeringChangeOrders.projectId, toNum(input.projectId));

    const [items, [{ value: total }]] = await Promise.all([
      db.select().from(engineeringChangeOrders)
        .where(where)
        .orderBy(desc(engineeringChangeOrders.updatedAt))
        .limit(input.limit)
        .offset(input.offset),
      db.select({ value: count() }).from(engineeringChangeOrders).where(where),
    ]);

    return { items, total: Number(total) };
  }),

  /** Create new ECO with affected file IDs */
  createEco: protectedProcedure.input(z.object({
    projectId: z.union([z.string(), z.number()]),
    ecoNumber: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    requestedBy: z.number().optional(),
    affectedFiles: z.array(z.number()).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();

    const [inserted] = await db.insert(engineeringChangeOrders).values({
      projectId: toNum(input.projectId),
      ecoNumber: input.ecoNumber,
      title: input.title,
      description: input.description ?? "",
      requestedBy: input.requestedBy ?? null,
      affectedFiles: input.affectedFiles ?? [],
      status: "DRAFT",
    } as any).returning();

    return inserted;
  }),
});
