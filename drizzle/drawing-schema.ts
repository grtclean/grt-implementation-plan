/**
 * Drawing Library Schema — 图纸库/BDO图纸管理
 *
 * Three tables:
 * 1. drawings          — main drawing registry (DWG-USC15-M-001 style)
 * 2. drawing_revisions — version history per drawing
 * 3. drawing_relations — links to BOM items, projects, ECR/ECO, etc.
 */
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ──────────────────────────────────────────────────────────────
// Table 1: drawings — Main drawing registry
// ──────────────────────────────────────────────────────────────
export const drawings = pgTable(
  "drawings",
  {
    id: serial("id").primaryKey(),

    // Identity
    drawingNumber: varchar("drawing_number", { length: 100 }).notNull().unique(),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),

    // Classification
    drawingType: varchar("drawing_type", { length: 30 }).notNull(), // mechanical | electrical | pneumatic | hydraulic | piping | assembly | detail | layout | schematic | wiring
    fileFormat: varchar("file_format", { length: 20 }), // dwg | dxf | pdf | sldprt | sldasm | step | igs | eplan

    // Versioning
    version: varchar("version", { length: 20 }).notNull().default("A.1"),
    revision: integer("revision").default(1),

    // Lifecycle status
    status: varchar("status", { length: 20 }).notNull().default("draft"), // draft | in_review | approved | released | obsolete

    // Product linkage
    productId: integer("product_id"),
    productCode: varchar("product_code", { length: 50 }),
    projectNumber: varchar("project_number", { length: 50 }),

    // People
    designer: varchar("designer", { length: 100 }),
    reviewer: varchar("reviewer", { length: 100 }),
    approver: varchar("approver", { length: 100 }),
    approvedAt: timestamp("approved_at"),
    releasedAt: timestamp("released_at"),

    // File info
    fileUrl: text("file_url"),
    fileSizeKb: integer("file_size_kb"),
    thumbnailUrl: text("thumbnail_url"),

    // Flexible metadata
    tags: jsonb("tags").default([]),
    metadata: jsonb("metadata").default({}),

    // Audit
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("drawings_drawing_number_idx").on(table.drawingNumber),
    index("drawings_product_id_idx").on(table.productId),
    index("drawings_product_code_idx").on(table.productCode),
    index("drawings_status_idx").on(table.status),
    index("drawings_drawing_type_idx").on(table.drawingType),
    index("drawings_created_at_idx").on(table.createdAt),
  ],
);

export type Drawing = InferSelectModel<typeof drawings>;
export type InsertDrawing = InferInsertModel<typeof drawings>;

// ──────────────────────────────────────────────────────────────
// Table 2: drawing_revisions — Version history
// ──────────────────────────────────────────────────────────────
export const drawingRevisions = pgTable(
  "drawing_revisions",
  {
    id: serial("id").primaryKey(),
    drawingId: integer("drawing_id").notNull(),
    version: varchar("version", { length: 20 }).notNull(),
    revision: integer("revision").notNull(),
    changeDescription: text("change_description"),
    changedBy: varchar("changed_by", { length: 100 }),
    fileUrl: text("file_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("drawing_revisions_drawing_id_idx").on(table.drawingId),
  ],
);

export type DrawingRevision = InferSelectModel<typeof drawingRevisions>;
export type InsertDrawingRevision = InferInsertModel<typeof drawingRevisions>;

// ──────────────────────────────────────────────────────────────
// Table 3: drawing_relations — Links between drawings and entities
// ──────────────────────────────────────────────────────────────
export const drawingRelations = pgTable(
  "drawing_relations",
  {
    id: serial("id").primaryKey(),
    drawingId: integer("drawing_id").notNull(),
    relationType: varchar("relation_type", { length: 30 }).notNull(), // bom_item | project | ecr | eco | requirement | parent_assembly
    relatedEntityId: integer("related_entity_id"),
    relatedEntityCode: varchar("related_entity_code", { length: 100 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("drawing_relations_drawing_id_idx").on(table.drawingId),
    index("drawing_relations_relation_type_idx").on(table.relationType),
  ],
);

export type DrawingRelation = InferSelectModel<typeof drawingRelations>;
export type InsertDrawingRelation = InferInsertModel<typeof drawingRelations>;
