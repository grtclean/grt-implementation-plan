/**
 * IDO (Intelligent Document Optimization) Schema — 文档智优中心
 *
 * 3 tables:
 *   - ido_stage_document_ui_map: M0-M12 stage → document → UI page → storage mapping
 *   - ido_storage_recommendations: Storage recommendation logs
 *   - ido_file_context_log: File-open context analytics
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ── Table 1: Core mapping registry ─────────────────────────────────────────

export const idoStageDocumentUiMap = pgTable(
  "ido_stage_document_ui_map",
  {
    id: serial("id").primaryKey(),

    // Stage reference
    stageCode: varchar("stage_code", { length: 10 }).notNull(),

    // Document definition
    documentTypeKey: varchar("document_type_key", { length: 100 }).notNull(),
    documentName: varchar("document_name", { length: 200 }).notNull(),
    documentNameEn: varchar("document_name_en", { length: 200 }),
    documentCategory: varchar("document_category", { length: 50 }).notNull(),
    fileExtensions: varchar("file_extensions", { length: 200 }),

    // UI page linkage
    uiPagePath: varchar("ui_page_path", { length: 500 }),
    uiPageName: varchar("ui_page_name", { length: 200 }),
    uiPageNameEn: varchar("ui_page_name_en", { length: 200 }),

    // Storage location
    sharepointFolder: varchar("sharepoint_folder", { length: 200 }),
    sharepointSubfolder: varchar("sharepoint_subfolder", { length: 200 }),
    plmDocType: varchar("plm_doc_type", { length: 30 }),
    orgDocDomain: varchar("org_doc_domain", { length: 100 }),

    // Metadata
    isMandatory: boolean("is_mandatory").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    responsibleRoles: jsonb("responsible_roles").$type<string[]>(),

    // Admin
    isActive: boolean("is_active").default(true).notNull(),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("ido_map_stage_idx").on(table.stageCode),
    index("ido_map_doc_type_idx").on(table.documentTypeKey),
    index("ido_map_ui_page_idx").on(table.uiPagePath),
    uniqueIndex("ido_map_uk_stage_doc").on(table.stageCode, table.documentTypeKey),
  ],
);

// ── Table 2: Storage recommendation logs ───────────────────────────────────

export const idoStorageRecommendations = pgTable(
  "ido_storage_recommendations",
  {
    id: serial("id").primaryKey(),

    // Context
    userId: integer("user_id").notNull(),
    projectId: integer("project_id"),
    stageCode: varchar("stage_code", { length: 10 }),

    // File info
    fileName: varchar("file_name", { length: 500 }).notNull(),
    fileExtension: varchar("file_extension", { length: 20 }),
    fileSizeBytes: integer("file_size_bytes"),
    mimeType: varchar("mime_type", { length: 200 }),

    // Recommendation
    recommendedPath: varchar("recommended_path", { length: 500 }),
    recommendedSpFolder: varchar("recommended_sp_folder", { length: 200 }),
    recommendedPlmDocType: varchar("recommended_plm_doc_type", { length: 30 }),
    matchedMapId: integer("matched_map_id"),
    confidenceScore: integer("confidence_score"),
    aiReasoning: text("ai_reasoning"),

    // User action
    userAction: varchar("user_action", { length: 30 }).default("pending"),
    actualPath: varchar("actual_path", { length: 500 }),

    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("ido_rec_user_idx").on(table.userId),
    index("ido_rec_project_idx").on(table.projectId),
    index("ido_rec_stage_idx").on(table.stageCode),
  ],
);

// ── Table 3: File-open context analytics ───────────────────────────────────

export const idoFileContextLog = pgTable(
  "ido_file_context_log",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    fileId: integer("file_id"),
    fileSource: varchar("file_source", { length: 30 }).notNull(),
    projectId: integer("project_id"),
    stageCode: varchar("stage_code", { length: 10 }),

    // What context was shown
    relatedDocCount: integer("related_doc_count").default(0),
    nextActionsShown: jsonb("next_actions_shown").$type<string[]>(),
    stageProgressShown: boolean("stage_progress_shown").default(false),

    // User engagement
    clickedRelatedDoc: boolean("clicked_related_doc").default(false),
    clickedNextAction: boolean("clicked_next_action").default(false),

    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("ido_foc_user_idx").on(table.userId),
    index("ido_foc_file_idx").on(table.fileId, table.fileSource),
  ],
);
