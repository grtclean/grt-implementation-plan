/**
 * GRT Digital Twin Service — IATF 16949 Compliance
 *
 * Core business logic for:
 *   1. SHA-256 hash generation & verification
 *   2. Version publishing (lock previous → OBSOLETE, create new)
 *   3. Audit log creation for every state transition
 *   4. Robot assembly node management
 */

import { eq, and, desc } from "drizzle-orm";
import { requireDb } from "../db";
import {
  dtAssets,
  dtRobotAssemblyNodes,
  iatfAuditLogs,
} from "../../drizzle/digital-twin-schema";
import { projects, users } from "../../drizzle/schema";
import crypto from "crypto";

// ── DB type alias ──
type DbClient = NonNullable<Awaited<ReturnType<typeof requireDb>>>;

// ── FK Validation Helpers ──

async function assertProjectExists(db: DbClient, projectId: number) {
  const [row] = await db.select({ id: projects.id }).from(projects)
    .where(eq(projects.id, projectId)).limit(1);
  if (!row) throw new Error(`FK violation: projects.id=${projectId} does not exist`);
}

async function assertUserExists(db: DbClient, userId: number) {
  const [row] = await db.select({ id: users.id }).from(users)
    .where(eq(users.id, userId)).limit(1);
  if (!row) throw new Error(`FK violation: users.id=${userId} does not exist`);
}

async function assertAssetExists(db: DbClient, assetId: number) {
  const [row] = await db.select({ id: dtAssets.id }).from(dtAssets)
    .where(eq(dtAssets.id, assetId)).limit(1);
  if (!row) throw new Error(`FK violation: dt_assets.id=${assetId} does not exist`);
  return row;
}

// ── SHA-256 Hash Generation ──

/**
 * Generate SHA-256 hash from a file buffer.
 * For IATF 16949, this hash is computed server-side on upload
 * and stored immutably once the asset is RELEASED.
 */
export function computeSha256(fileBuffer: Buffer): string {
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

/**
 * Generate SHA-256 hash from a string (e.g., file URL for placeholder).
 * Used when actual file bytes are not available (e.g., URL-only uploads).
 */
export function computeSha256FromString(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

// ── Core Service Functions ──

/**
 * Create a new Digital Twin asset.
 * Generates SHA-256 hash and creates initial audit log entry.
 */
export async function createAsset(input: {
  projectId?: number;
  projectCode?: string;
  assetName: string;
  assetNumber?: string;
  fileFormat: "glb" | "gltf" | "step" | "zw1" | "sldprt" | "sldasm" | "fbx" | "obj" | "stl" | "other";
  storageUrl: string;
  originalFileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  sha256Hash: string;
  ownerUserId?: number;
  ownerName?: string;
  description?: string;
  tags?: string[];
  vertexCount?: number;
  faceCount?: number;
  thumbnailUrl?: string;
  createdBy?: number;
  metadata?: Record<string, unknown>;
}) {
  const db = await requireDb();

  // Validate FK references in parallel
  const validations: Promise<void>[] = [];
  if (input.projectId) validations.push(assertProjectExists(db, input.projectId));
  if (input.ownerUserId) validations.push(assertUserExists(db, input.ownerUserId));
  if (input.createdBy) validations.push(assertUserExists(db, input.createdBy));
  if (validations.length > 0) await Promise.all(validations);

  const [asset] = await db.insert(dtAssets).values({
    projectId: input.projectId,
    projectCode: input.projectCode,
    assetName: input.assetName,
    assetNumber: input.assetNumber,
    fileFormat: input.fileFormat,
    storageUrl: input.storageUrl,
    originalFileName: input.originalFileName,
    fileSizeBytes: input.fileSizeBytes,
    mimeType: input.mimeType,
    sha256Hash: input.sha256Hash,
    status: "draft",
    version: 1,
    versionString: "V1.0",
    isLatest: true,
    ownerUserId: input.ownerUserId,
    ownerName: input.ownerName,
    description: input.description,
    tags: input.tags,
    vertexCount: input.vertexCount,
    faceCount: input.faceCount,
    thumbnailUrl: input.thumbnailUrl,
    metadata: input.metadata,
    createdBy: input.createdBy,
    updatedBy: input.createdBy,
  }).returning();

  // Create IATF audit log entry
  if (input.createdBy) {
    await db.insert(iatfAuditLogs).values({
      assetId: asset.id,
      action: "upload",
      actorId: input.createdBy,
      actorName: input.ownerName,
      hashAtAction: input.sha256Hash,
      newStatus: "draft",
      assetVersion: 1,
      details: `Initial upload: ${input.assetName}`,
    });
  }

  return asset;
}

/**
 * publishAssetVersion — Core IATF 16949 Compliance Function
 *
 * 1. Lock the previous (current latest) version as OBSOLETE
 * 2. Create a new version with fresh SHA-256 hash
 * 3. Create an IATF audit log entry for full traceability
 *
 * This function ensures the version chain is never broken and
 * every transition is logged with actor, timestamp, and hash.
 */
export async function publishAssetVersion(input: {
  previousAssetId: number;
  assetName?: string;
  storageUrl: string;
  originalFileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  sha256Hash: string;
  fileFormat?: "glb" | "gltf" | "step" | "zw1" | "sldprt" | "sldasm" | "fbx" | "obj" | "stl" | "other";
  uploadedBy: number;
  uploadedByName?: string;
  description?: string;
  vertexCount?: number;
  faceCount?: number;
  thumbnailUrl?: string;
  ipAddress?: string;
}) {
  const db = await requireDb();

  // 1. Validate the uploader exists
  await assertUserExists(db, input.uploadedBy);

  // 2. Fetch previous asset for version chain
  const prevResults = await db.select().from(dtAssets)
    .where(eq(dtAssets.id, input.previousAssetId)).limit(1000);
  const prevAsset = prevResults[0];

  if (!prevAsset) {
    throw new Error(`Asset ${input.previousAssetId} not found`);
  }

  const newVersion = prevAsset.version + 1;
  const newVersionString = `V${newVersion}.0`;

  // 3. Lock previous version as OBSOLETE (in a transaction-like sequence)
  await db.update(dtAssets)
    .set({
      status: "obsolete",
      isLatest: false,
      updatedBy: input.uploadedBy,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(dtAssets.id, input.previousAssetId));

  // 4. Create IATF audit log for the OBSOLETE transition
  await db.insert(iatfAuditLogs).values({
    assetId: input.previousAssetId,
    action: "obsolete",
    actorId: input.uploadedBy,
    actorName: input.uploadedByName,
    hashAtAction: prevAsset.sha256Hash,
    previousStatus: prevAsset.status,
    newStatus: "obsolete",
    assetVersion: prevAsset.version,
    ipAddress: input.ipAddress,
    details: `Superseded by V${newVersion}.0`,
  });

  // 5. Create new version asset
  const [newAsset] = await db.insert(dtAssets).values({
    projectId: prevAsset.projectId,
    projectCode: prevAsset.projectCode,
    assetName: input.assetName || prevAsset.assetName,
    assetNumber: prevAsset.assetNumber,
    version: newVersion,
    versionString: newVersionString,
    previousVersionId: prevAsset.id,
    fileFormat: input.fileFormat || prevAsset.fileFormat,
    storageUrl: input.storageUrl,
    originalFileName: input.originalFileName,
    fileSizeBytes: input.fileSizeBytes,
    mimeType: input.mimeType,
    sha256Hash: input.sha256Hash,
    status: "draft",
    isLatest: true,
    ownerUserId: prevAsset.ownerUserId,
    ownerName: prevAsset.ownerName,
    description: input.description || prevAsset.description,
    tags: prevAsset.tags,
    vertexCount: input.vertexCount,
    faceCount: input.faceCount,
    thumbnailUrl: input.thumbnailUrl,
    createdBy: input.uploadedBy,
    updatedBy: input.uploadedBy,
  }).returning();

  // 6. Create IATF audit log for the new upload
  await db.insert(iatfAuditLogs).values({
    assetId: newAsset.id,
    action: "upload",
    actorId: input.uploadedBy,
    actorName: input.uploadedByName,
    hashAtAction: input.sha256Hash,
    newStatus: "draft",
    assetVersion: newVersion,
    ipAddress: input.ipAddress,
    details: `New version uploaded: ${newVersionString}`,
  });

  return newAsset;
}

/**
 * Approve an asset — transition from PENDING_REVIEW → RELEASED.
 * Once RELEASED, the SHA-256 hash is considered immutable per IATF 16949.
 */
export async function approveAsset(input: {
  assetId: number;
  approvedBy: number;
  approvedByName?: string;
  ipAddress?: string;
  comments?: string;
}) {
  const db = await requireDb();

  const approveResults = await db.select().from(dtAssets)
    .where(eq(dtAssets.id, input.assetId)).limit(1000);
  const asset = approveResults[0];

  if (!asset) throw new Error(`Asset ${input.assetId} not found`);
  if (asset.status !== "pending_review") {
    throw new Error(`Cannot approve asset in '${asset.status}' status — must be 'pending_review'`);
  }

  // Transition to RELEASED
  const [updated] = await db.update(dtAssets)
    .set({
      status: "released",
      updatedBy: input.approvedBy,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(dtAssets.id, input.assetId))
    .returning();

  // IATF audit log
  await db.insert(iatfAuditLogs).values({
    assetId: input.assetId,
    action: "approve",
    actorId: input.approvedBy,
    actorName: input.approvedByName,
    hashAtAction: asset.sha256Hash,
    previousStatus: "pending_review",
    newStatus: "released",
    assetVersion: asset.version,
    ipAddress: input.ipAddress,
    details: input.comments || "Asset approved and released",
  });

  return updated;
}

/**
 * Apply design freeze to an asset.
 * This is an IATF 16949 gate — once frozen, the asset and its hash
 * are locked and cannot be modified without creating a new version.
 */
export async function freezeAsset(input: {
  assetId: number;
  frozenBy: number;
  frozenByName?: string;
  ipAddress?: string;
}) {
  const db = await requireDb();

  const freezeResults = await db.select().from(dtAssets)
    .where(eq(dtAssets.id, input.assetId)).limit(1000);
  const asset = freezeResults[0];

  if (!asset) throw new Error(`Asset ${input.assetId} not found`);
  if (asset.status !== "released") {
    throw new Error(`Cannot freeze asset in '${asset.status}' status — must be 'released'`);
  }

  const now = new Date().toISOString();
  const [updated] = await db.update(dtAssets)
    .set({
      designFrozen: true,
      designFrozenAt: now,
      designFrozenBy: input.frozenBy,
      updatedBy: input.frozenBy,
      updatedAt: now,
    })
    .where(eq(dtAssets.id, input.assetId))
    .returning();

  // IATF audit log
  await db.insert(iatfAuditLogs).values({
    assetId: input.assetId,
    action: "freeze",
    actorId: input.frozenBy,
    actorName: input.frozenByName,
    hashAtAction: asset.sha256Hash,
    previousStatus: asset.status,
    newStatus: "released",
    assetVersion: asset.version,
    ipAddress: input.ipAddress,
    details: "Design freeze applied — asset locked per IATF 16949",
  });

  return updated;
}

/**
 * Verify SHA-256 hash integrity for an asset.
 * Used for periodic IATF 16949 compliance audits.
 */
export async function verifyHash(input: {
  assetId: number;
  computedHash: string;
  verifiedBy: number;
  verifiedByName?: string;
  ipAddress?: string;
}) {
  const db = await requireDb();

  const verifyResults = await db.select().from(dtAssets)
    .where(eq(dtAssets.id, input.assetId)).limit(1000);
  const asset = verifyResults[0];

  if (!asset) throw new Error(`Asset ${input.assetId} not found`);

  const isValid = asset.sha256Hash === input.computedHash;

  // Always log hash verification attempts
  await db.insert(iatfAuditLogs).values({
    assetId: input.assetId,
    action: "hash_verify",
    actorId: input.verifiedBy,
    actorName: input.verifiedByName,
    hashAtAction: input.computedHash,
    assetVersion: asset.version,
    ipAddress: input.ipAddress,
    details: isValid
      ? "Hash verification PASSED — file integrity confirmed"
      : `Hash verification FAILED — expected ${asset.sha256Hash}, got ${input.computedHash}`,
  });

  return {
    isValid,
    expectedHash: asset.sha256Hash,
    computedHash: input.computedHash,
    assetName: asset.assetName,
    version: asset.versionString,
  };
}
