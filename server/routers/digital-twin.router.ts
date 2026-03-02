/**
 * GRT Digital Twin Hub — tRPC Router
 * IATF 16949 compliant 3D asset management, versioning, and audit
 */
import { z } from "zod";
import { jsonValue } from "@shared/validators";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import {
  dtAssets,
  dtRobotAssemblyNodes,
  iatfAuditLogs,
} from "../../drizzle/digital-twin-schema";
import { users } from "../../drizzle/schema";
import {
  createAsset,
  publishAssetVersion,
  approveAsset,
  freezeAsset,
  verifyHash,
} from "../services/digital-twin.service";
import { eq, and, desc, count, ilike } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const digitalTwinRouter = router({

  // ══════════════════════════════════════════════════
  // Assets — CRUD
  // ══════════════════════════════════════════════════

  listAssets: protectedProcedure.input(z.object({
    projectId: z.union([z.string(), z.number()]).optional(),
    fileFormat: z.string().optional(),
    status: z.string().optional(),
    search: z.string().optional(),
    isLatest: z.boolean().optional(),
    limit: z.number().default(50),
    offset: z.number().default(0),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const conditions = [];

    if (input?.projectId) {
      conditions.push(eq(dtAssets.projectId, toNum(input.projectId)));
    }
    if (input?.fileFormat) {
      conditions.push(eq(dtAssets.fileFormat, input.fileFormat as any));
    }
    if (input?.status) {
      conditions.push(eq(dtAssets.status, input.status as any));
    }
    if (input?.search) {
      conditions.push(ilike(dtAssets.assetName, `%${input.search}%`));
    }
    if (input?.isLatest !== undefined) {
      conditions.push(eq(dtAssets.isLatest, input.isLatest));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ value: total }]] = await Promise.all([
      db.select().from(dtAssets)
        .where(where)
        .orderBy(desc(dtAssets.updatedAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0),
      db.select({ value: count() }).from(dtAssets).where(where),
    ]);

    return { items, total: Number(total) };
  }),

  getAsset: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [asset] = await db.select().from(dtAssets)
      .where(eq(dtAssets.id, toNum(input.id))).limit(1000);
    if (!asset) return null;

    // Fetch version chain + assembly nodes + recent audit logs in parallel
    const [versionChain, assemblyNodes, auditLogs] = await Promise.all([
      asset.assetNumber
        ? db.select().from(dtAssets)
            .where(eq(dtAssets.assetNumber, asset.assetNumber))
            .orderBy(desc(dtAssets.version))
        : Promise.resolve([]),
      db.select().from(dtRobotAssemblyNodes)
        .where(eq(dtRobotAssemblyNodes.dtAssetId, asset.id))
        .orderBy(dtRobotAssemblyNodes.assemblySequence),
      db.select().from(iatfAuditLogs)
        .where(eq(iatfAuditLogs.assetId, asset.id))
        .orderBy(desc(iatfAuditLogs.timestampUtc))
        .limit(50),
    ]);

    return { ...asset, versionChain, assemblyNodes, auditLogs };
  }),

  createAsset: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
    projectCode: z.string().optional(),
    assetName: z.string().min(1),
    assetNumber: z.string().optional(),
    fileFormat: z.enum(["glb", "gltf", "step", "zw1", "sldprt", "sldasm", "fbx", "obj", "stl", "other"]),
    storageUrl: z.string().min(1),
    originalFileName: z.string().optional(),
    fileSizeBytes: z.number().optional(),
    mimeType: z.string().optional(),
    sha256Hash: z.string().min(1),
    ownerUserId: z.number().optional(),
    ownerName: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    vertexCount: z.number().optional(),
    faceCount: z.number().optional(),
    thumbnailUrl: z.string().optional(),
    metadata: z.record(z.string(), jsonValue).optional(),
  })).mutation(async ({ input, ctx }) => {
    return createAsset({ ...input, createdBy: ctx.user.id });
  }),

  updateAsset: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    assetName: z.string().optional(),
    description: z.string().optional(),
    ownerUserId: z.number().optional(),
    ownerName: z.string().optional(),
    tags: z.array(z.string()).optional(),
    thumbnailUrl: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const assetId = toNum(input.id);

    // Check asset exists and is not frozen
    const [existing] = await db.select().from(dtAssets)
      .where(eq(dtAssets.id, assetId)).limit(1000);
    if (!existing) throw new Error(`Asset ${assetId} not found`);
    if (existing.designFrozen) {
      throw new Error("Cannot modify a design-frozen asset — create a new version instead");
    }

    // Validate FK references
    if (input.ownerUserId) {
      const [user] = await db.select({ id: users.id }).from(users)
        .where(eq(users.id, input.ownerUserId)).limit(1);
      if (!user) throw new Error(`FK violation: users.id=${input.ownerUserId} does not exist`);
    }

    const { id, ...data } = input;
    const [updated] = await db.update(dtAssets)
      .set({ ...data, updatedBy: ctx.user.id, updatedAt: new Date().toISOString() })
      .where(eq(dtAssets.id, assetId))
      .returning();
    return updated;
  }),

  submitForReview: protectedProcedure.input(z.object({
    assetId: z.union([z.string(), z.number()]),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const assetId = toNum(input.assetId);

    const [asset] = await db.select().from(dtAssets)
      .where(eq(dtAssets.id, assetId)).limit(1000);
    if (!asset) throw new Error(`Asset ${assetId} not found`);
    if (asset.status !== "draft") {
      throw new Error(`Cannot submit for review — asset is '${asset.status}', must be 'draft'`);
    }

    const [updated] = await db.update(dtAssets)
      .set({ status: "pending_review", updatedBy: ctx.user.id, updatedAt: new Date().toISOString() })
      .where(eq(dtAssets.id, assetId))
      .returning();

    // IATF audit log
    await db.insert(iatfAuditLogs).values({
      assetId,
      action: "upload",
      actorId: ctx.user.id,
      actorName: ctx.user.name ?? `User#${ctx.user.id}`,
      hashAtAction: asset.sha256Hash,
      previousStatus: "draft",
      newStatus: "pending_review",
      assetVersion: asset.version,
      details: "Submitted for IATF 16949 review",
    });

    return updated;
  }),

  // ══════════════════════════════════════════════════
  // Version Management — IATF 16949
  // ══════════════════════════════════════════════════

  publishVersion: protectedProcedure.input(z.object({
    previousAssetId: z.union([z.string(), z.number()]),
    assetName: z.string().optional(),
    storageUrl: z.string().min(1),
    originalFileName: z.string().optional(),
    fileSizeBytes: z.number().optional(),
    mimeType: z.string().optional(),
    sha256Hash: z.string().min(1),
    fileFormat: z.enum(["glb", "gltf", "step", "zw1", "sldprt", "sldasm", "fbx", "obj", "stl", "other"]).optional(),
    description: z.string().optional(),
    vertexCount: z.number().optional(),
    faceCount: z.number().optional(),
    thumbnailUrl: z.string().optional(),
    ipAddress: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    return publishAssetVersion({
      ...input,
      previousAssetId: toNum(input.previousAssetId),
      uploadedBy: ctx.user.id,
      uploadedByName: ctx.user.name ?? `User#${ctx.user.id}`,
    });
  }),

  approveAsset: protectedProcedure.input(z.object({
    assetId: z.union([z.string(), z.number()]),
    ipAddress: z.string().optional(),
    comments: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    return approveAsset({
      ...input,
      assetId: toNum(input.assetId),
      approvedBy: ctx.user.id,
      approvedByName: ctx.user.name ?? `User#${ctx.user.id}`,
    });
  }),

  freezeAsset: protectedProcedure.input(z.object({
    assetId: z.union([z.string(), z.number()]),
    ipAddress: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    return freezeAsset({
      ...input,
      assetId: toNum(input.assetId),
      frozenBy: ctx.user.id,
      frozenByName: ctx.user.name ?? `User#${ctx.user.id}`,
    });
  }),

  verifyHash: protectedProcedure.input(z.object({
    assetId: z.union([z.string(), z.number()]),
    computedHash: z.string().min(1),
    ipAddress: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    return verifyHash({
      ...input,
      assetId: toNum(input.assetId),
      verifiedBy: ctx.user.id,
      verifiedByName: ctx.user.name ?? `User#${ctx.user.id}`,
    });
  }),

  // ══════════════════════════════════════════════════
  // Robot Assembly Nodes
  // ══════════════════════════════════════════════════

  listAssemblyNodes: protectedProcedure.input(z.object({
    dtAssetId: z.union([z.string(), z.number()]),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const items = await db.select().from(dtRobotAssemblyNodes)
      .where(eq(dtRobotAssemblyNodes.dtAssetId, toNum(input.dtAssetId)))
      .orderBy(dtRobotAssemblyNodes.assemblySequence).limit(1000);
    return { items, total: items.length };
  }),

  createAssemblyNode: protectedProcedure.input(z.object({
    dtAssetId: z.union([z.string(), z.number()]),
    partNumber: z.string().min(1),
    partName: z.string().optional(),
    positionX: z.string(),
    positionY: z.string(),
    positionZ: z.string(),
    rotationX: z.string().optional(),
    rotationY: z.string().optional(),
    rotationZ: z.string().optional(),
    assemblyTorqueNm: z.string().optional(),
    assemblySequence: z.number().optional(),
    toolRequired: z.string().optional(),
    gripType: z.string().optional(),
    safetyClearanceMm: z.string().optional(),
    nodeType: z.string().optional(),
    instructions: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const assetId = toNum(input.dtAssetId);
    const [asset] = await db.select({ id: dtAssets.id }).from(dtAssets)
      .where(eq(dtAssets.id, assetId)).limit(1);
    if (!asset) throw new Error(`FK violation: dt_assets.id=${assetId} does not exist`);
    const [node] = await db.insert(dtRobotAssemblyNodes).values({
      dtAssetId: assetId,
      partNumber: input.partNumber,
      partName: input.partName,
      positionX: input.positionX,
      positionY: input.positionY,
      positionZ: input.positionZ,
      rotationX: input.rotationX,
      rotationY: input.rotationY,
      rotationZ: input.rotationZ,
      assemblyTorqueNm: input.assemblyTorqueNm,
      assemblySequence: input.assemblySequence,
      toolRequired: input.toolRequired,
      gripType: input.gripType,
      safetyClearanceMm: input.safetyClearanceMm,
      nodeType: input.nodeType,
      instructions: input.instructions,
      createdBy: ctx.user.id,
    }).returning();
    return node;
  }),

  // ══════════════════════════════════════════════════
  // IATF Audit Logs — Read-Only
  // ══════════════════════════════════════════════════

  listAuditLogs: protectedProcedure.input(z.object({
    assetId: z.union([z.string(), z.number()]).optional(),
    actorId: z.number().optional(),
    action: z.string().optional(),
    limit: z.number().default(100),
    offset: z.number().default(0),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const conditions = [];

    if (input?.assetId) {
      conditions.push(eq(iatfAuditLogs.assetId, toNum(input.assetId)));
    }
    if (input?.actorId) {
      conditions.push(eq(iatfAuditLogs.actorId, input.actorId));
    }
    if (input?.action) {
      conditions.push(eq(iatfAuditLogs.action, input.action as any));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ value: total }]] = await Promise.all([
      db.select().from(iatfAuditLogs)
        .where(where)
        .orderBy(desc(iatfAuditLogs.timestampUtc))
        .limit(input?.limit ?? 100)
        .offset(input?.offset ?? 0),
      db.select({ value: count() }).from(iatfAuditLogs).where(where),
    ]);

    return { items, total: Number(total) };
  }),

  // ══════════════════════════════════════════════════
  // Dashboard Stats
  // ══════════════════════════════════════════════════

  getStats: protectedProcedure.input(z.object({
    projectId: z.union([z.string(), z.number()]).optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const conditions = [];

    if (input?.projectId) {
      conditions.push(eq(dtAssets.projectId, toNum(input.projectId)));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [
      [{ value: total }],
      [{ value: released }],
      [{ value: pendingReview }],
      [{ value: frozen }],
      [{ value: glbCount }],
    ] = await Promise.all([
      db.select({ value: count() }).from(dtAssets).where(where),
      db.select({ value: count() }).from(dtAssets).where(
        where ? and(where, eq(dtAssets.status, "released")) : eq(dtAssets.status, "released")
      ),
      db.select({ value: count() }).from(dtAssets).where(
        where ? and(where, eq(dtAssets.status, "pending_review")) : eq(dtAssets.status, "pending_review")
      ),
      db.select({ value: count() }).from(dtAssets).where(
        where ? and(where, eq(dtAssets.designFrozen, true)) : eq(dtAssets.designFrozen, true)
      ),
      db.select({ value: count() }).from(dtAssets).where(
        where ? and(where, eq(dtAssets.fileFormat, "glb")) : eq(dtAssets.fileFormat, "glb")
      ),
    ]);

    const t = Number(total);
    return {
      total: t,
      released: Number(released),
      pendingReview: Number(pendingReview),
      frozen: Number(frozen),
      glbViewable: Number(glbCount),
      complianceRate: t > 0 ? Math.round((Number(released) + Number(frozen)) / t * 100) : 0,
    };
  }),
});
