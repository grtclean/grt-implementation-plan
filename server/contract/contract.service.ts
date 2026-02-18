/**
 * Contract Service - Contract Management CRUD + Document Upload + AI Analysis
 *
 * P0: Contract CRUD with auto-code generation
 * P1: Document upload/download/delete (base64 → local filesystem)
 * P2: AI document analysis via invokeLLM
 */

import { requireDb } from "../db";
import {
  contracts,
  contractDocuments,
  contractAiAnalyses,
} from "../../drizzle/contract-schema";
import { eq, ilike, and, desc, sql, or } from "drizzle-orm";
import path from "path";
import fs from "fs/promises";

// ============================================================
// P0: Contract CRUD
// ============================================================

export async function listContracts(params: {
  search?: string;
  type?: string;
  status?: string;
  customerId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const { search, type, status, customerId, limit = 20, offset = 0 } = params;

  const conditions: any[] = [];
  if (type) conditions.push(eq(contracts.type, type));
  if (status) conditions.push(eq(contracts.status, status));
  if (customerId) conditions.push(eq(contracts.customerId, customerId));
  if (search) {
    conditions.push(
      or(
        ilike(contracts.title, `%${search}%`),
        ilike(contracts.contractCode, `%${search}%`)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(contracts)
    .where(where)
    .orderBy(desc(contracts.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contracts)
    .where(where);

  return {
    items,
    total: countResult[0]?.count ?? 0,
    limit,
    offset,
  };
}

export async function getContractById(id: number) {
  const db = await requireDb();
  const results = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .limit(1);
  return results[0] ?? null;
}

export async function createContract(data: {
  customerId?: number;
  opportunityId?: number;
  title: string;
  type?: string;
  amount?: string;
  currency?: string;
  status?: string;
  signDate?: string;
  startDate?: string;
  endDate?: string;
  terms?: string;
  notes?: string;
  createdBy?: number;
}) {
  const db = await requireDb();

  // Auto-generate contract code: CT-YYYY-NNN
  const year = new Date().getFullYear();
  const prefix = `CT-${year}-`;

  const maxCodeResult = await db
    .select({ maxCode: sql<string>`MAX(contract_code)` })
    .from(contracts);

  let nextNumber = 1;
  const maxCode = maxCodeResult[0]?.maxCode;
  if (maxCode) {
    const match = maxCode.match(/CT-\d{4}-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  const contractCode = `${prefix}${String(nextNumber).padStart(3, "0")}`;

  const insertData: any = {
    contractCode,
    title: data.title,
    type: data.type || "sales",
    status: data.status || "draft",
    currency: data.currency || "CNY",
  };

  if (data.customerId) insertData.customerId = data.customerId;
  if (data.opportunityId) insertData.opportunityId = data.opportunityId;
  if (data.amount) insertData.amount = data.amount;
  if (data.signDate) insertData.signDate = data.signDate;
  if (data.startDate) insertData.startDate = data.startDate;
  if (data.endDate) insertData.endDate = data.endDate;
  if (data.terms) insertData.terms = data.terms;
  if (data.notes) insertData.notes = data.notes;
  if (data.createdBy) insertData.createdBy = data.createdBy;

  const result = await db.insert(contracts).values(insertData).returning();
  return result[0];
}

export async function updateContract(
  id: number,
  data: {
    customerId?: number;
    opportunityId?: number;
    title?: string;
    type?: string;
    amount?: string;
    currency?: string;
    status?: string;
    signDate?: string;
    startDate?: string;
    endDate?: string;
    terms?: string;
    notes?: string;
  }
) {
  const db = await requireDb();

  const updateData: any = { ...data, updatedAt: sql`now()` };
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) delete updateData[key];
  });

  const result = await db
    .update(contracts)
    .set(updateData)
    .where(eq(contracts.id, id))
    .returning();

  return result[0] ?? null;
}

export async function deleteContract(id: number) {
  const db = await requireDb();

  // Delete related documents and analyses first
  await db
    .delete(contractAiAnalyses)
    .where(eq(contractAiAnalyses.contractId, id));
  await db
    .delete(contractDocuments)
    .where(eq(contractDocuments.contractId, id));
  const result = await db
    .delete(contracts)
    .where(eq(contracts.id, id))
    .returning();

  return result[0] ?? null;
}

export async function getContractStats() {
  const db = await requireDb();

  const totalResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contracts);

  const totalAmountResult = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(contracts)
    .where(eq(contracts.currency, "CNY"));

  const activeResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contracts)
    .where(eq(contracts.status, "active"));

  const expiringResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contracts)
    .where(
      and(
        eq(contracts.status, "active"),
        sql`end_date IS NOT NULL AND end_date::date <= (CURRENT_DATE + INTERVAL '30 days')`
      )
    );

  return {
    total: totalResult[0]?.count ?? 0,
    totalAmount: totalAmountResult[0]?.total ?? "0",
    activeCount: activeResult[0]?.count ?? 0,
    expiringCount: expiringResult[0]?.count ?? 0,
  };
}

// ============================================================
// P1: Document Upload & Management
// ============================================================

const UPLOAD_BASE = path.resolve(process.cwd(), "uploads", "contracts");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function uploadDocument(params: {
  contractId: number;
  fileName: string;
  mimeType: string;
  docType: string;
  fileBase64: string;
  uploadedBy?: number;
}) {
  const db = await requireDb();

  const fileBuffer = Buffer.from(params.fileBase64, "base64");
  const fileSize = fileBuffer.length;

  // Generate unique filename
  const ext = path.extname(params.fileName) || "";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const dir = path.join(UPLOAD_BASE, String(params.contractId));
  await ensureDir(dir);

  const filePath = path.join(dir, uniqueName);
  await fs.writeFile(filePath, fileBuffer);

  const relativePath = `uploads/contracts/${params.contractId}/${uniqueName}`;

  const result = await db
    .insert(contractDocuments)
    .values({
      contractId: params.contractId,
      fileName: uniqueName,
      originalName: params.fileName,
      fileSize,
      mimeType: params.mimeType,
      filePath: relativePath,
      docType: params.docType,
      uploadedBy: params.uploadedBy,
    })
    .returning();

  return result[0];
}

export async function getDocuments(contractId: number, docType?: string) {
  const db = await requireDb();

  const conditions: any[] = [eq(contractDocuments.contractId, contractId)];
  if (docType) conditions.push(eq(contractDocuments.docType, docType));

  return db
    .select()
    .from(contractDocuments)
    .where(and(...conditions))
    .orderBy(desc(contractDocuments.createdAt));
}

export async function getDocumentById(id: number) {
  const db = await requireDb();
  const results = await db
    .select()
    .from(contractDocuments)
    .where(eq(contractDocuments.id, id))
    .limit(1);
  return results[0] ?? null;
}

export async function deleteDocument(id: number) {
  const db = await requireDb();

  const doc = await getDocumentById(id);
  if (!doc) return null;

  // Delete AI analyses for this document
  await db
    .delete(contractAiAnalyses)
    .where(eq(contractAiAnalyses.documentId, id));

  // Delete file from filesystem
  try {
    const fullPath = path.resolve(process.cwd(), doc.filePath);
    await fs.unlink(fullPath);
  } catch {
    // File may already be deleted
  }

  const result = await db
    .delete(contractDocuments)
    .where(eq(contractDocuments.id, id))
    .returning();

  return result[0] ?? null;
}

// ============================================================
// P2: AI Document Analysis
// ============================================================

export async function analyzeDocument(documentId: number) {
  const db = await requireDb();

  const doc = await getDocumentById(documentId);
  if (!doc) throw new Error(`Document ${documentId} not found`);

  // Create analysis record as "processing"
  const insertResult = await db
    .insert(contractAiAnalyses)
    .values({
      documentId,
      contractId: doc.contractId,
      analysisType: "full",
      status: "processing",
    })
    .returning();

  const analysisId = insertResult[0].id;

  try {
    // Read file content
    const fullPath = path.resolve(process.cwd(), doc.filePath);
    const fileBuffer = await fs.readFile(fullPath);
    let textContent: string;

    if (
      doc.mimeType === "text/plain" ||
      doc.mimeType === "text/csv" ||
      doc.mimeType === "text/markdown"
    ) {
      textContent = fileBuffer.toString("utf-8");
    } else {
      // For PDF / docx / other binary, send base64 with a note
      textContent = `[文件: ${doc.originalName}, 类型: ${doc.mimeType}, 大小: ${doc.fileSize} bytes]\n\n` +
        `Base64 content (first 50000 chars):\n${fileBuffer.toString("base64").slice(0, 50000)}`;
    }

    const { invokeLLM } = await import("../_core/llm");

    const result = await invokeLLM({
      system: `你是GRT工业清洗设备公司的合同文档分析AI助手。请分析以下文档内容，提取关键需求并映射到5大模块。
返回严格的JSON格式。`,
      prompt: `请分析以下文档并提取结构化需求：

文档名称: ${doc.originalName}
文档类型: ${doc.docType}

内容:
${textContent.slice(0, 30000)}

请按以下JSON结构返回分析结果:`,
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "document_analysis",
          schema: {
            type: "object",
            properties: {
              summary: { type: "string", description: "文档摘要（100字以内）" },
              contract_terms: {
                type: "object",
                description: "客户合同条款",
                properties: {
                  payment_terms: { type: "string" },
                  delivery_terms: { type: "string" },
                  warranty_terms: { type: "string" },
                  penalty_terms: { type: "string" },
                },
                required: ["payment_terms", "delivery_terms", "warranty_terms", "penalty_terms"],
                additionalProperties: false,
              },
              configuration: {
                type: "object",
                description: "设备配置建议",
                properties: {
                  equipment_model: { type: "string" },
                  process_params: { type: "string" },
                  automation_level: { type: "string" },
                },
                required: ["equipment_model", "process_params", "automation_level"],
                additionalProperties: false,
              },
              project_params: {
                type: "object",
                description: "项目参数",
                properties: {
                  timeline: { type: "string" },
                  milestones: { type: "string" },
                  acceptance_criteria: { type: "string" },
                },
                required: ["timeline", "milestones", "acceptance_criteria"],
                additionalProperties: false,
              },
              quality_specs: {
                type: "object",
                description: "质量规格",
                properties: {
                  cleanliness_standard: { type: "string" },
                  inspection_method: { type: "string" },
                  pass_rate: { type: "string" },
                },
                required: ["cleanliness_standard", "inspection_method", "pass_rate"],
                additionalProperties: false,
              },
              delivery: {
                type: "object",
                description: "交付要求",
                properties: {
                  delivery_location: { type: "string" },
                  packaging: { type: "string" },
                  transport: { type: "string" },
                  installation: { type: "string" },
                },
                required: ["delivery_location", "packaging", "transport", "installation"],
                additionalProperties: false,
              },
              risks: {
                type: "array",
                description: "风险提示",
                items: { type: "string" },
              },
              recommendations: {
                type: "array",
                description: "建议操作",
                items: { type: "string" },
              },
            },
            required: [
              "summary",
              "contract_terms",
              "configuration",
              "project_params",
              "quality_specs",
              "delivery",
              "risks",
              "recommendations",
            ],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    const content = result.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { summary: content, error: "Failed to parse AI response as JSON" };
    }

    // Build module mapping from extracted data
    const moduleMapping = {
      contract_terms: parsed.contract_terms || {},
      configuration: parsed.configuration || {},
      project_params: parsed.project_params || {},
      quality_specs: parsed.quality_specs || {},
      delivery: parsed.delivery || {},
    };

    await db
      .update(contractAiAnalyses)
      .set({
        extractedRequirements: parsed,
        moduleMapping,
        rawResponse: content,
        status: "completed",
        updatedAt: sql`now()`,
      })
      .where(eq(contractAiAnalyses.id, analysisId));

    return {
      id: analysisId,
      status: "completed",
      extractedRequirements: parsed,
      moduleMapping,
    };
  } catch (error: any) {
    await db
      .update(contractAiAnalyses)
      .set({
        status: "failed",
        rawResponse: error.message,
        updatedAt: sql`now()`,
      })
      .where(eq(contractAiAnalyses.id, analysisId));

    throw error;
  }
}

export async function getAnalysis(documentId: number) {
  const db = await requireDb();
  const results = await db
    .select()
    .from(contractAiAnalyses)
    .where(eq(contractAiAnalyses.documentId, documentId))
    .orderBy(desc(contractAiAnalyses.createdAt))
    .limit(1);
  return results[0] ?? null;
}

export async function getAnalysesByContract(contractId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(contractAiAnalyses)
    .where(eq(contractAiAnalyses.contractId, contractId))
    .orderBy(desc(contractAiAnalyses.createdAt));
}

export async function applyAnalysis(analysisId: number, userId: number) {
  const db = await requireDb();
  const result = await db
    .update(contractAiAnalyses)
    .set({
      status: "applied",
      appliedBy: userId,
      appliedAt: new Date().toISOString(),
      updatedAt: sql`now()`,
    })
    .where(eq(contractAiAnalyses.id, analysisId))
    .returning();

  return result[0] ?? null;
}
