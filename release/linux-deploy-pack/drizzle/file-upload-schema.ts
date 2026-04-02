/**
 * File Upload Schema — Chunked upload for large CAD files (500MB+)
 *
 * Tables:
 * - file_upload_sessions: Upload lifecycle tracking
 * - file_upload_chunks: Individual chunk tracking with SHA256 checksums
 */

import {
  pgTable, pgEnum, serial, integer, varchar, text,
  timestamp, boolean, index,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const uploadStatusEnum = pgEnum("upload_status", [
  "uploading", "assembling", "completed", "failed", "cancelled",
]);

// ── Upload Sessions ─────────────────────────────────────────────────────

export const fileUploadSessions = pgTable("file_upload_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull().unique(),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  chunkSizeBytes: integer("chunk_size_bytes").notNull().default(5242880), // 5MB
  totalChunks: integer("total_chunks").notNull(),
  completedChunks: integer("completed_chunks").notNull().default(0),
  status: uploadStatusEnum("status").notNull().default("uploading"),
  mimeType: varchar("mime_type", { length: 200 }).default("application/octet-stream"),
  uploadedBy: varchar("uploaded_by", { length: 100 }).notNull(),
  targetPath: varchar("target_path", { length: 1000 }).default(""),
  sharepointSiteCode: varchar("sharepoint_site_code", { length: 20 }),
  projectId: integer("project_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: "string" }),
}, (table) => [
  index("upload_sessions_session_idx").on(table.sessionId),
  index("upload_sessions_status_idx").on(table.status),
  index("upload_sessions_user_idx").on(table.uploadedBy),
]);

export type FileUploadSession = InferSelectModel<typeof fileUploadSessions>;
export type InsertFileUploadSession = InferInsertModel<typeof fileUploadSessions>;

// ── Upload Chunks ───────────────────────────────────────────────────────

export const fileUploadChunks = pgTable("file_upload_chunks", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  chunkSizeBytes: integer("chunk_size_bytes").notNull(),
  checksum: varchar("checksum", { length: 64 }).notNull(), // SHA256
  storagePath: varchar("storage_path", { length: 1000 }).notNull(),
  receivedAt: timestamp("received_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("upload_chunks_session_idx").on(table.sessionId),
  index("upload_chunks_session_chunk_idx").on(table.sessionId, table.chunkIndex),
]);

export type FileUploadChunk = InferSelectModel<typeof fileUploadChunks>;
export type InsertFileUploadChunk = InferInsertModel<typeof fileUploadChunks>;
