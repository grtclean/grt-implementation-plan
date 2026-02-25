/**
 * GRT Cloud Vault — tRPC Router
 * File management, version check-in, and Engineering Change Order workflows
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
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
  list: publicProcedure.input(z.object({
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
  getById: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [file] = await db.select().from(grtVaultFiles)
      .where(eq(grtVaultFiles.id, toNum(input.id)));
    return file ?? null;
  }),

  /** Mock upload — inserts file record; auto-generates webViewerUrl for SOLIDWORKS/EPLAN */
  upload: publicProcedure.input(z.object({
    projectId: z.union([z.string(), z.number()]),
    fileName: z.string().min(1),
    fileType: z.enum(["SOLIDWORKS", "EPLAN", "WORD", "PDF", "EMAIL_EML", "MEETING_RECORD"]),
    uploadBy: z.string().min(1),
    size: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();

    // Auto-generate webViewerUrl for CAD/electrical types
    let webViewerUrl: string | null = null;
    if (input.fileType === "SOLIDWORKS" || input.fileType === "EPLAN") {
      webViewerUrl = `/viewer/${input.fileType.toLowerCase()}/${encodeURIComponent(input.fileName)}`;
    }

    const [inserted] = await db.insert(grtVaultFiles).values({
      projectId: toNum(input.projectId),
      fileName: input.fileName,
      fileType: input.fileType,
      version: "v1.0",
      uploadBy: input.uploadBy,
      size: input.size ?? null,
      webViewerUrl,
    }).returning();

    return inserted;
  }),

  /** Mock version bump — parses "v1.2" → "v1.3" */
  checkin: publicProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const [file] = await db.select().from(grtVaultFiles)
      .where(eq(grtVaultFiles.id, toNum(input.id)));

    if (!file) throw new Error(`Vault file not found: id=${input.id}`);

    // Parse current version and bump minor
    const match = file.version.match(/^v(\d+)\.(\d+)$/);
    const major = match ? parseInt(match[1]) : 1;
    const minor = match ? parseInt(match[2]) + 1 : 1;
    const newVersion = `v${major}.${minor}`;

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
  listEcos: publicProcedure.input(z.object({
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

  /** Create new ECO with linked file IDs */
  createEco: publicProcedure.input(z.object({
    projectId: z.union([z.string(), z.number()]),
    description: z.string().min(1),
    requestedBy: z.string().min(1),
    linkedFileIds: z.array(z.number()).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();

    const [inserted] = await db.insert(engineeringChangeOrders).values({
      projectId: toNum(input.projectId),
      description: input.description,
      requestedBy: input.requestedBy,
      linkedFileIds: input.linkedFileIds ?? [],
      status: "draft",
    }).returning();

    return inserted;
  }),
});
