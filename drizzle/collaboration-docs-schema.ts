/**
 * Collaboration Docs Schema — GRT协同云盘
 *
 * Tables:
 *  - collaboration_docs_folders: folder hierarchy
 *  - collaboration_docs_files: file metadata + parsed spreadsheet content
 */

import { pgTable, serial, varchar, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

// ── Folders ──
export const collaborationDocsFolders = pgTable("collaboration_docs_folders", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: integer("parent_id"),
  createdBy: varchar("created_by", { length: 100 }).notNull().default("System"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Files ──
export const collaborationDocsFiles = pgTable("collaboration_docs_files", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 20 }).notNull().default("xlsx"),
  fileSize: integer("file_size").notNull().default(0),
  folderId: integer("folder_id"),
  uploadedBy: varchar("uploaded_by", { length: 100 }).notNull().default("System"),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  parsedContent: jsonb("parsed_content"),
  modifiedAt: timestamp("modified_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
