import { pgTable, serial, varchar, text, decimal, integer, timestamp, json, index } from "drizzle-orm/pg-core";

/**
 * Contract Management Schema - 3 tables
 * - contracts: Core contract records
 * - contract_documents: Uploaded documents (tech specs, bidding reqs, etc.)
 * - contract_ai_analyses: AI extraction results from documents
 */

// ============================================================
// contracts
// ============================================================

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  contractCode: varchar("contract_code", { length: 50 }).notNull().unique(),
  customerId: integer("customer_id"),
  opportunityId: integer("opportunity_id"),
  title: varchar("title", { length: 300 }).notNull(),
  type: varchar("type", { length: 30 }).notNull().default("sales"),
  amount: decimal("amount", { precision: 15, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("CNY"),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  signDate: varchar("sign_date", { length: 20 }),
  startDate: varchar("start_date", { length: 20 }),
  endDate: varchar("end_date", { length: 20 }),
  terms: text("terms"),
  notes: text("notes"),
  projectId: integer("project_id"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("contracts_code_idx").on(table.contractCode),
  index("contracts_customer_id_idx").on(table.customerId),
  index("contracts_status_idx").on(table.status),
  index("contracts_type_idx").on(table.type),
  index("contracts_project_id_idx").on(table.projectId),
]);

// ============================================================
// contract_documents
// ============================================================

export const contractDocuments = pgTable("contract_documents", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull(),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  originalName: varchar("original_name", { length: 500 }).notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  filePath: text("file_path").notNull(),
  docType: varchar("doc_type", { length: 30 }).notNull().default("other"),
  uploadedBy: integer("uploaded_by"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("contract_docs_contract_id_idx").on(table.contractId),
  index("contract_docs_doc_type_idx").on(table.docType),
]);

// ============================================================
// contract_ai_analyses
// ============================================================

export const contractAiAnalyses = pgTable("contract_ai_analyses", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  contractId: integer("contract_id").notNull(),
  analysisType: varchar("analysis_type", { length: 50 }).default("full"),
  extractedRequirements: json("extracted_requirements"),
  moduleMapping: json("module_mapping"),
  rawResponse: text("raw_response"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  appliedBy: integer("applied_by"),
  appliedAt: timestamp("applied_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("contract_ai_document_id_idx").on(table.documentId),
  index("contract_ai_contract_id_idx").on(table.contractId),
  index("contract_ai_status_idx").on(table.status),
]);
