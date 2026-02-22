/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║       GRT Digital Twin Hub — IATF 16949 Compliant Schema        ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  CEO Directive: "Digital Twin Hub for 3D asset management"      ║
 * ║  - Manage 3D assets (.gltf/.glb) in browser for sales &        ║
 * ║    shop-floor assembly viewing                                  ║
 * ║  - IATF 16949 tamper-proof version control (SHA-256 hash)      ║
 * ║  - Future-ready: Humanoid Robot assembly spatial coordinates    ║
 * ║                                                                 ║
 * ║  Tables:                                                        ║
 * ║    1. dt_assets               — Core 3D/2D file registry        ║
 * ║    2. dt_robot_assembly_nodes — Spatial coords for robot ops    ║
 * ║    3. iatf_audit_logs         — Tamper-proof audit trail        ║
 * ║                                                                 ║
 * ║  FK Constraints:                                                ║
 * ║    · dt_assets.project_id              → projects.id            ║
 * ║    · dt_assets.owner_user_id           → users.id               ║
 * ║    · dt_assets.created_by              → users.id               ║
 * ║    · dt_assets.updated_by              → users.id               ║
 * ║    · dt_robot_assembly_nodes.dt_asset_id → dt_assets.id         ║
 * ║    · dt_robot_assembly_nodes.created_by  → users.id             ║
 * ║    · iatf_audit_logs.asset_id          → dt_assets.id           ║
 * ║    · iatf_audit_logs.actor_id          → users.id               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  json,
  bigint,
  decimal,
  index,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Parent table references (existing GRT core tables) ──
import { projects, users } from "./schema";

// ══════════════════════════════════════════════════════
// Enums
// ══════════════════════════════════════════════════════

/** Supported 3D/CAD file formats */
export const dtFileFormatEnum = pgEnum("dt_file_format", [
  "glb",      // Binary glTF (web-optimized, primary viewer format)
  "gltf",     // Text-based glTF
  "step",     // STEP/STP (CAD interchange, ISO 10303)
  "zw1",      // ZW3D native format
  "sldprt",   // SolidWorks part
  "sldasm",   // SolidWorks assembly
  "fbx",      // Autodesk FBX
  "obj",      // Wavefront OBJ
  "stl",      // STL (3D printing / mesh)
  "other",    // Catch-all for unsupported formats
]);

/** IATF 16949 compliant asset lifecycle */
export const dtAssetStatusEnum = pgEnum("dt_asset_status", [
  "draft",            // Initial upload, not reviewed
  "pending_review",   // Submitted for IATF compliance review
  "released",         // Approved, tamper-proof (hash locked)
  "obsolete",         // Superseded by newer version
]);

/** Audit log action types for IATF 16949 */
export const iatfAuditActionEnum = pgEnum("iatf_audit_action", [
  "upload",           // New asset or version uploaded
  "approve",          // Asset approved / status changed to released
  "reject",           // Review rejected
  "freeze",           // Design freeze applied
  "obsolete",         // Marked as obsolete (superseded)
  "download",         // Tracked download for compliance
  "delete",           // Soft-delete / archive
  "hash_verify",      // Integrity re-verification
]);

// ══════════════════════════════════════════════════════
// Table 1: dt_assets — Core 3D/2D Files Registry
// ══════════════════════════════════════════════════════

export const dtAssets = pgTable("dt_assets", {
  id: serial("id").primaryKey(),

  /** FK → projects.id — which project this asset belongs to */
  projectId: integer("project_id").references(() => projects.id),

  /** Denormalized project code for quick display */
  projectCode: varchar("project_code", { length: 50 }),

  /** Human-readable asset name, e.g. "GRT-3000 Main Assembly" */
  assetName: varchar("asset_name", { length: 300 }).notNull(),

  /** Structured asset number, e.g. "DT-MECH-00001" */
  assetNumber: varchar("asset_number", { length: 50 }),

  /** Version integer — incremented on each new upload */
  version: integer("version").default(1).notNull(),

  /** Display version string, e.g. "V1.0", "V2.0" */
  versionString: varchar("version_string", { length: 20 }).default("V1.0"),

  /** Previous version ID for version chain */
  previousVersionId: integer("previous_version_id"),

  // ── File metadata ──

  /** 3D/CAD file format */
  fileFormat: dtFileFormatEnum("file_format").notNull(),

  /** Storage URL/path to the physical file (S3, MinIO, local FS) */
  storageUrl: varchar("storage_url", { length: 1000 }).notNull(),

  /** Original filename as uploaded */
  originalFileName: varchar("original_file_name", { length: 500 }),

  /** File size in bytes */
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),

  /** MIME type */
  mimeType: varchar("mime_type", { length: 100 }),

  // ── IATF 16949 Compliance Fields ──

  /**
   * SHA-256 hash — CRITICAL for IATF 16949 tamper-proof verification.
   * Generated server-side on upload; compared on every download.
   * Once status = 'released', this hash is IMMUTABLE.
   */
  sha256Hash: varchar("sha256_hash", { length: 64 }).notNull(),

  /** IATF 16949 lifecycle status */
  status: dtAssetStatusEnum("status").default("draft").notNull(),

  /** Is this the latest version of this asset chain? */
  isLatest: boolean("is_latest").default(true),

  /** Has this asset been design-frozen? (IATF gate) */
  designFrozen: boolean("design_frozen").default(false),

  /** When the design freeze was applied */
  designFrozenAt: timestamp("design_frozen_at", { mode: "string" }),

  /** Who applied the design freeze (FK → users.id) */
  designFrozenBy: integer("design_frozen_by").references(() => users.id),

  // ── 3D viewer metadata ──

  /** GLB-specific: vertex count (for LOD decisions) */
  vertexCount: integer("vertex_count"),

  /** GLB-specific: triangle/face count */
  faceCount: integer("face_count"),

  /** Bounding box dimensions (for camera auto-fit) */
  boundingBox: json("bounding_box").$type<{
    minX: number; minY: number; minZ: number;
    maxX: number; maxY: number; maxZ: number;
  }>(),

  /** Thumbnail URL for grid/list views (auto-generated from GLB) */
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),

  // ── Ownership & metadata ──

  /** Responsible engineer (FK → users.id) */
  ownerUserId: integer("owner_user_id").references(() => users.id),
  ownerName: varchar("owner_name", { length: 128 }),

  /** Searchable tags */
  tags: json("tags").$type<string[]>(),

  /** Arbitrary metadata for AI consumption */
  metadata: json("metadata").$type<Record<string, unknown>>(),

  description: text("description"),

  // ── Audit ──
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("dt_assets_project_idx").on(table.projectId),
  index("dt_assets_format_idx").on(table.fileFormat),
  index("dt_assets_status_idx").on(table.status),
  index("dt_assets_owner_idx").on(table.ownerUserId),
  index("dt_assets_hash_idx").on(table.sha256Hash),
  index("dt_assets_latest_idx").on(table.isLatest),
  index("dt_assets_frozen_idx").on(table.designFrozen),
]);

// ══════════════════════════════════════════════════════
// Table 2: dt_robot_assembly_nodes — Spatial Coordinates
//   Future-ready for Humanoid Robot assembly instructions
// ══════════════════════════════════════════════════════

export const dtRobotAssemblyNodes = pgTable("dt_robot_assembly_nodes", {
  id: serial("id").primaryKey(),

  /** FK → dt_assets.id — which 3D asset this node belongs to */
  dtAssetId: integer("dt_asset_id").references(() => dtAssets.id).notNull(),

  /** Part number in BOM, e.g. "GRT-BRG-1027" */
  partNumber: varchar("part_number", { length: 100 }).notNull(),

  /** Human-readable part name */
  partName: varchar("part_name", { length: 300 }),

  // ── Spatial coordinates (millimeters, world-space) ──

  /** X position in 3D space */
  positionX: decimal("position_x", { precision: 12, scale: 4 }).notNull(),

  /** Y position in 3D space */
  positionY: decimal("position_y", { precision: 12, scale: 4 }).notNull(),

  /** Z position in 3D space */
  positionZ: decimal("position_z", { precision: 12, scale: 4 }).notNull(),

  // ── Rotation (Euler angles in degrees) ──
  rotationX: decimal("rotation_x", { precision: 8, scale: 4 }).default("0"),
  rotationY: decimal("rotation_y", { precision: 8, scale: 4 }).default("0"),
  rotationZ: decimal("rotation_z", { precision: 8, scale: 4 }).default("0"),

  // ── Assembly parameters (machine-readable for robot) ──

  /** Assembly torque in Newton-meters (for bolt/fastener nodes) */
  assemblyTorqueNm: decimal("assembly_torque_nm", { precision: 8, scale: 2 }),

  /** Assembly sequence order (robot executes in this order) */
  assemblySequence: integer("assembly_sequence"),

  /** Tool required for this assembly step */
  toolRequired: varchar("tool_required", { length: 100 }),

  /** Grip type for robot end-effector */
  gripType: varchar("grip_type", { length: 50 }),

  /** Safety zone clearance in mm (robot must maintain this distance) */
  safetyClearanceMm: decimal("safety_clearance_mm", { precision: 8, scale: 2 }),

  /** Node type: part, fastener, sub-assembly, fixture, tool-point */
  nodeType: varchar("node_type", { length: 30 }).default("part"),

  /** Additional assembly instructions (human + robot readable) */
  instructions: text("instructions"),

  /** Arbitrary metadata */
  metadata: json("metadata").$type<Record<string, unknown>>(),

  // ── Audit ──
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("dt_robot_nodes_asset_idx").on(table.dtAssetId),
  index("dt_robot_nodes_part_idx").on(table.partNumber),
  index("dt_robot_nodes_sequence_idx").on(table.assemblySequence),
]);

// ══════════════════════════════════════════════════════
// Table 3: iatf_audit_logs — Tamper-Proof Audit Trail
//   IATF 16949 requires complete traceability of all
//   document/asset actions with timestamps and actors
// ══════════════════════════════════════════════════════

export const iatfAuditLogs = pgTable("iatf_audit_logs", {
  id: serial("id").primaryKey(),

  /** FK → dt_assets.id — which asset was acted upon */
  assetId: integer("asset_id").references(() => dtAssets.id).notNull(),

  /** What action was performed */
  action: iatfAuditActionEnum("action").notNull(),

  /** Who performed the action (FK → users.id) */
  actorId: integer("actor_id").references(() => users.id).notNull(),

  /** Actor display name (denormalized for report generation) */
  actorName: varchar("actor_name", { length: 128 }),

  /** UTC timestamp (never use local time for IATF compliance) */
  timestampUtc: timestamp("timestamp_utc", { mode: "string" }).defaultNow().notNull(),

  /** Client IP address (IATF 16949 access tracking) */
  ipAddress: varchar("ip_address", { length: 45 }),

  /** User agent string for forensics */
  userAgent: varchar("user_agent", { length: 500 }),

  /** SHA-256 hash at time of action (for tamper verification) */
  hashAtAction: varchar("hash_at_action", { length: 64 }),

  /** Previous status before this action */
  previousStatus: varchar("previous_status", { length: 30 }),

  /** New status after this action */
  newStatus: varchar("new_status", { length: 30 }),

  /** Version at time of action */
  assetVersion: integer("asset_version"),

  /** Free-text details about the action */
  details: text("details"),

  /** Structured metadata for compliance reports */
  metadata: json("metadata").$type<Record<string, unknown>>(),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("iatf_audit_asset_idx").on(table.assetId),
  index("iatf_audit_action_idx").on(table.action),
  index("iatf_audit_actor_idx").on(table.actorId),
  index("iatf_audit_timestamp_idx").on(table.timestampUtc),
]);

// ── Type Exports ──────────────────────────────────────

export type DtAsset = InferSelectModel<typeof dtAssets>;
export type InsertDtAsset = InferInsertModel<typeof dtAssets>;
export type DtRobotAssemblyNode = InferSelectModel<typeof dtRobotAssemblyNodes>;
export type InsertDtRobotAssemblyNode = InferInsertModel<typeof dtRobotAssemblyNodes>;
export type IatfAuditLog = InferSelectModel<typeof iatfAuditLogs>;
export type InsertIatfAuditLog = InferInsertModel<typeof iatfAuditLogs>;
